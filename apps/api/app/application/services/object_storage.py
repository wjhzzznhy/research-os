import json
import time
import logging
import io
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from app.core.config import settings

logger = logging.getLogger(__name__)


class AccessLevel(Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    PRESIGNED = "presigned"


@dataclass
class StorageConfig:
    connect_timeout: float = 10.0
    read_timeout: float = 60.0
    max_pool_connections: int = 10
    retries: int = 3
    retry_delay: float = 1.0
    presigned_url_expires: int = 3600
    enable_access_log: bool = True


@dataclass
class AccessLogEntry:
    timestamp: str
    operation: str
    bucket: str
    key: str
    success: bool
    error: Optional[str] = None
    size_bytes: Optional[int] = None
    duration_ms: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class AccessLogger:
    def __init__(self, enabled: bool = True, max_entries: int = 10000):
        self.enabled = enabled
        self.max_entries = max_entries
        self._logs: List[AccessLogEntry] = []

    def log(self, entry: AccessLogEntry) -> None:
        if not self.enabled:
            return
        self._logs.append(entry)
        if len(self._logs) > self.max_entries:
            self._logs = self._logs[-self.max_entries:]
        logger.info(
            f"Storage Access: op={entry.operation}, bucket={entry.bucket}, "
            f"key={entry.key}, success={entry.success}, duration={entry.duration_ms:.2f}ms"
        )

    def get_logs(
        self,
        bucket: Optional[str] = None,
        operation: Optional[str] = None,
        limit: int = 100,
    ) -> List[AccessLogEntry]:
        logs = self._logs
        if bucket:
            logs = [l for l in logs if l.bucket == bucket]
        if operation:
            logs = [l for l in logs if l.operation == operation]
        return logs[-limit:]

    def get_stats(self) -> Dict[str, Any]:
        if not self._logs:
            return {"total": 0, "success_rate": 0.0}
        success_count = sum(1 for l in self._logs if l.success)
        return {
            "total": len(self._logs),
            "success_count": success_count,
            "failure_count": len(self._logs) - success_count,
            "success_rate": success_count / len(self._logs),
        }


PUBLIC_BUCKET_POLICY = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {"AWS": "*"},
            "Action": ["s3:GetObject", "s3:GetObjectVersion"],
            "Resource": ["arn:aws:s3:::${bucket}/*"],
        }
    ],
}


class StorageService:
    _instance = None

    def __new__(cls, config: Optional[StorageConfig] = None):
        if cls._instance is None:
            cls._instance = super(StorageService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, config: Optional[StorageConfig] = None):
        if self._initialized:
            return

        self.config = config or StorageConfig()
        self.client = None
        self.bucket_papers = None
        self.bucket_assets = None
        self.access_logger = AccessLogger(enabled=self.config.enable_access_log)
        self._initialized = True

    def _get_client(self):
        if self.client:
            return self.client

        try:
            self.client = boto3.client(
                's3',
                endpoint_url=settings.RUSTFS_ENDPOINT,
                aws_access_key_id=settings.RUSTFS_ACCESS_KEY,
                aws_secret_access_key=settings.RUSTFS_SECRET_KEY,
                config=Config(
                    signature_version='s3v4',
                    connect_timeout=self.config.connect_timeout,
                    read_timeout=self.config.read_timeout,
                    retries={'max_attempts': self.config.retries},
                    max_pool_connections=self.config.max_pool_connections,
                ),
                region_name='us-east-1'
            )

            self.bucket_papers = settings.RUSTFS_BUCKET_PAPERS
            self.bucket_assets = settings.RUSTFS_BUCKET_ASSETS
            self._ensure_buckets_with_retry()
            return self.client
        except Exception as e:
            logger.error(f"Failed to initialize RustFS client: {e}", exc_info=True)
            raise RuntimeError("Storage service is not available") from e

    def _set_bucket_public_policy(self, bucket_name: str) -> bool:
        try:
            policy = json.dumps(PUBLIC_BUCKET_POLICY).replace("${bucket}", bucket_name)
            self.client.put_bucket_policy(Bucket=bucket_name, Policy=policy)
            logger.info(f"Set public read policy for bucket: {bucket_name}")
            return True
        except Exception as e:
            logger.warning(f"Failed to set public policy for bucket {bucket_name}: {e}")
            return False

    def _ensure_buckets_with_retry(self, max_retries=3, delay=2):
        if not self.client:
            return

        for i in range(max_retries):
            try:
                self.client.head_bucket(Bucket=self.bucket_papers)
                if self.bucket_assets:
                    self.client.head_bucket(Bucket=self.bucket_assets)
                logger.info(
                    f"Successfully connected to RustFS, buckets '{self.bucket_papers}' and '{self.bucket_assets}' exist."
                )
                self._ensure_public_policy()
                return
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', '')
                if error_code == '404':
                    try:
                        self.client.create_bucket(Bucket=self.bucket_papers)
                        if self.bucket_assets:
                            self.client.create_bucket(Bucket=self.bucket_assets)
                        logger.info(f"Created buckets '{self.bucket_papers}' and '{self.bucket_assets}'")
                        self._ensure_public_policy()
                        return
                    except Exception as create_err:
                        logger.warning(f"Failed to create bucket: {create_err}")
                logger.warning(f"Failed to connect to RustFS (Attempt {i+1}/{max_retries}): {e}")
                if i < max_retries - 1:
                    time.sleep(delay)

        logger.error("Could not connect to RustFS after multiple retries. Service may fail.")

    def _ensure_public_policy(self):
        self._set_bucket_public_policy(self.bucket_papers)
        if self.bucket_assets:
            self._set_bucket_public_policy(self.bucket_assets)

    def _get_public_base_url(self) -> str:
        public_endpoint = (settings.RUSTFS_PUBLIC_ENDPOINT or "").strip()
        if public_endpoint:
            if public_endpoint.startswith("http://") or public_endpoint.startswith("https://"):
                return public_endpoint.rstrip("/")
            protocol = "https" if settings.RUSTFS_SECURE else "http"
            return f"{protocol}://{public_endpoint}".rstrip("/")
        return ""

    def _log_access(
        self,
        operation: str,
        bucket: str,
        key: str,
        success: bool,
        error: Optional[str] = None,
        size_bytes: Optional[int] = None,
        duration_ms: Optional[float] = None,
        metadata: Optional[Dict] = None,
    ) -> None:
        entry = AccessLogEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            operation=operation,
            bucket=bucket,
            key=key,
            success=success,
            error=error,
            size_bytes=size_bytes,
            duration_ms=duration_ms,
            metadata=metadata or {},
        )
        self.access_logger.log(entry)

    def upload_file(
        self,
        file_data,
        file_name: str,
        content_type: str = "application/pdf",
        bucket: Optional[str] = None,
        metadata: Optional[Dict] = None,
        access_level: AccessLevel = AccessLevel.PUBLIC,
    ) -> str:
        client = self._get_client()
        if not client:
            raise RuntimeError("Storage service is not available")

        start_time = time.time()

        if isinstance(file_data, (bytes, bytearray)):
            file_data = io.BytesIO(file_data)

        target_bucket = bucket or self.bucket_papers

        extra_args = {'ContentType': content_type}
        if metadata:
            extra_args['Metadata'] = {k: str(v) for k, v in metadata.items()}

        last_exception = None
        for attempt in range(self.config.retries):
            try:
                client.upload_fileobj(
                    file_data,
                    target_bucket,
                    file_name,
                    ExtraArgs=extra_args,
                )

                duration_ms = (time.time() - start_time) * 1000
                self._log_access(
                    operation="upload",
                    bucket=target_bucket,
                    key=file_name,
                    success=True,
                    duration_ms=duration_ms,
                    metadata={"content_type": content_type, "access_level": access_level.value},
                )

                if access_level == AccessLevel.PUBLIC:
                    base_url = self._get_public_base_url()
                    if base_url:
                        return f"{base_url}/{target_bucket}/{file_name}"
                    return f"/{target_bucket}/{file_name}"
                else:
                    return file_name

            except Exception as e:
                last_exception = e
                logger.warning(f"Upload attempt {attempt + 1} failed: {e}")
                if attempt < self.config.retries - 1:
                    time.sleep(self.config.retry_delay * (attempt + 1))
                    if hasattr(file_data, 'seek'):
                        file_data.seek(0)

        duration_ms = (time.time() - start_time) * 1000
        self._log_access(
            operation="upload",
            bucket=target_bucket,
            key=file_name,
            success=False,
            error=str(last_exception),
            duration_ms=duration_ms,
        )

        logger.error(f"All upload attempts failed")
        raise last_exception

    def download_file(self, file_name: str, bucket: Optional[str] = None) -> bytes:
        client = self._get_client()
        if not client:
            raise RuntimeError("Storage service is not available")

        start_time = time.time()
        target_bucket = bucket or self.bucket_papers

        try:
            response = client.get_object(Bucket=target_bucket, Key=file_name)
            content = response['Body'].read()

            duration_ms = (time.time() - start_time) * 1000
            self._log_access(
                operation="download",
                bucket=target_bucket,
                key=file_name,
                success=True,
                size_bytes=len(content),
                duration_ms=duration_ms,
            )

            return content

        except ClientError as e:
            duration_ms = (time.time() - start_time) * 1000
            error_code = e.response.get('Error', {}).get('Code', '')
            self._log_access(
                operation="download",
                bucket=target_bucket,
                key=file_name,
                success=False,
                error=error_code,
                duration_ms=duration_ms,
            )
            raise

    def try_download_file(self, file_name: str, bucket: Optional[str] = None) -> Optional[bytes]:
        try:
            return self.download_file(file_name=file_name, bucket=bucket)
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code in ('NoSuchKey', 'NoSuchBucket', '404'):
                return None
            raise

    def delete_file(self, file_name: str, bucket: Optional[str] = None) -> bool:
        client = self._get_client()
        if not client:
            raise RuntimeError("Storage service is not available")

        start_time = time.time()
        target_bucket = bucket or self.bucket_papers

        try:
            client.delete_object(Bucket=target_bucket, Key=file_name)

            duration_ms = (time.time() - start_time) * 1000
            self._log_access(
                operation="delete",
                bucket=target_bucket,
                key=file_name,
                success=True,
                duration_ms=duration_ms,
            )

            logger.info(f"Successfully deleted file: {target_bucket}/{file_name}")
            return True

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            duration_ms = (time.time() - start_time) * 1000
            self._log_access(
                operation="delete",
                bucket=target_bucket,
                key=file_name,
                success=False,
                error=error_code,
                duration_ms=duration_ms,
            )

            if error_code in ('NoSuchKey', 'NoSuchBucket', '404'):
                logger.warning(f"File not found for deletion: {target_bucket}/{file_name}")
                return False
            logger.error(f"Failed to delete file {target_bucket}/{file_name}: {e}")
            raise

    def delete_files(self, file_names: list[str], bucket: Optional[str] = None) -> dict[str, bool]:
        results: dict[str, bool] = {}
        for file_name in file_names:
            try:
                results[file_name] = self.delete_file(file_name, bucket=bucket)
            except Exception as e:
                logger.error(f"Failed to delete {file_name}: {e}")
                results[file_name] = False
        return results

    def generate_presigned_url(
        self,
        file_name: str,
        bucket: Optional[str] = None,
        expires_in: Optional[int] = None,
    ) -> str:
        client = self._get_client()
        target_bucket = bucket or self.bucket_papers
        expires_in = expires_in or self.config.presigned_url_expires

        start_time = time.time()

        try:
            url = client.generate_presigned_url(
                ClientMethod='get_object',
                Params={'Bucket': target_bucket, 'Key': file_name},
                ExpiresIn=expires_in,
            )

            duration_ms = (time.time() - start_time) * 1000
            self._log_access(
                operation="presign",
                bucket=target_bucket,
                key=file_name,
                success=True,
                duration_ms=duration_ms,
                metadata={"expires_in": expires_in},
            )

            return url

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            self._log_access(
                operation="presign",
                bucket=target_bucket,
                key=file_name,
                success=False,
                error=str(e),
                duration_ms=duration_ms,
            )
            raise

    def generate_presigned_upload_url(
        self,
        file_name: str,
        bucket: Optional[str] = None,
        content_type: Optional[str] = None,
        expires_in: Optional[int] = None,
    ) -> Dict[str, Any]:
        client = self._get_client()
        target_bucket = bucket or self.bucket_assets
        expires_in = expires_in or self.config.presigned_url_expires

        start_time = time.time()

        try:
            params = {'Bucket': target_bucket, 'Key': file_name}
            if content_type:
                params['ContentType'] = content_type

            url = client.generate_presigned_url(
                ClientMethod='put_object',
                Params=params,
                ExpiresIn=expires_in,
            )

            duration_ms = (time.time() - start_time) * 1000
            self._log_access(
                operation="presign_upload",
                bucket=target_bucket,
                key=file_name,
                success=True,
                duration_ms=duration_ms,
                metadata={"expires_in": expires_in},
            )

            return {
                "url": url,
                "method": "PUT",
                "expires_in": expires_in,
                "headers": {
                    "Content-Type": content_type,
                } if content_type else {},
            }

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            self._log_access(
                operation="presign_upload",
                bucket=target_bucket,
                key=file_name,
                success=False,
                error=str(e),
                duration_ms=duration_ms,
            )
            raise

    def file_exists(self, file_name: str, bucket: Optional[str] = None) -> bool:
        client = self._get_client()
        target_bucket = bucket or self.bucket_assets

        try:
            client.head_object(Bucket=target_bucket, Key=file_name)
            return True
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code in ('404', 'NoSuchKey'):
                return False
            raise

    def get_file_metadata(self, file_name: str, bucket: Optional[str] = None) -> Optional[Dict[str, Any]]:
        client = self._get_client()
        target_bucket = bucket or self.bucket_assets

        try:
            response = client.head_object(Bucket=target_bucket, Key=file_name)
            return {
                "content_type": response.get('ContentType'),
                "content_length": response.get('ContentLength'),
                "last_modified": response.get('LastModified'),
                "etag": response.get('ETag'),
                "metadata": response.get('Metadata', {}),
            }
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code in ('404', 'NoSuchKey'):
                return None
            raise

    def get_access_logs(
        self,
        bucket: Optional[str] = None,
        operation: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        logs = self.access_logger.get_logs(bucket=bucket, operation=operation, limit=limit)
        return [
            {
                "timestamp": log.timestamp,
                "operation": log.operation,
                "bucket": log.bucket,
                "key": log.key,
                "success": log.success,
                "error": log.error,
                "size_bytes": log.size_bytes,
                "duration_ms": log.duration_ms,
            }
            for log in logs
        ]

    def get_access_stats(self) -> Dict[str, Any]:
        return self.access_logger.get_stats()


storage_service = StorageService()
