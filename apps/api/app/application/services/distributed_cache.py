import json
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)


@dataclass
class CacheStats:
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    errors: int = 0
    
    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0


class CacheBackend(ABC):
    @abstractmethod
    async def get(self, key: str) -> Optional[bytes]:
        pass
    
    @abstractmethod
    async def set(self, key: str, value: bytes, ttl: Optional[int] = None) -> bool:
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> bool:
        pass
    
    @abstractmethod
    async def exists(self, key: str) -> bool:
        pass
    
    @abstractmethod
    async def clear(self) -> bool:
        pass
    
    @abstractmethod
    def get_stats(self) -> CacheStats:
        pass


class RedisCacheBackend(CacheBackend):
    def __init__(
        self,
        redis_url: str,
        prefix: str = "emb:",
        default_ttl: int = 86400,
        connection_pool_size: int = 10,
    ):
        self.redis_url = redis_url
        self.prefix = prefix
        self.default_ttl = default_ttl
        self.connection_pool_size = connection_pool_size
        self._client = None
        self._stats = CacheStats()
    
    def _get_client(self):
        if self._client is not None:
            return self._client
        
        try:
            import redis.asyncio as redis
            from redis.asyncio.connection import ConnectionPool
            
            pool = ConnectionPool.from_url(
                self.redis_url,
                max_connections=self.connection_pool_size,
                decode_responses=False,
            )
            self._client = redis.Redis(connection_pool=pool)
            logger.info(f"Redis cache backend initialized: {self.redis_url}")
            return self._client
        except ImportError:
            logger.warning("redis package not installed, falling back to local cache")
            raise RuntimeError("Redis package not installed")
    
    def _make_key(self, key: str) -> str:
        return f"{self.prefix}{key}"
    
    async def get(self, key: str) -> Optional[bytes]:
        try:
            client = self._get_client()
            full_key = self._make_key(key)
            value = await client.get(full_key)
            
            if value is not None:
                self._stats.hits += 1
                logger.debug(f"Redis cache hit: {key[:16]}...")
            else:
                self._stats.misses += 1
            
            return value
        except Exception as e:
            self._stats.errors += 1
            logger.warning(f"Redis get error: {e}")
            return None
    
    async def set(self, key: str, value: bytes, ttl: Optional[int] = None) -> bool:
        try:
            client = self._get_client()
            full_key = self._make_key(key)
            ttl = ttl or self.default_ttl
            
            await client.setex(full_key, ttl, value)
            self._stats.sets += 1
            logger.debug(f"Redis cache set: {key[:16]}... (ttl={ttl})")
            return True
        except Exception as e:
            self._stats.errors += 1
            logger.warning(f"Redis set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        try:
            client = self._get_client()
            full_key = self._make_key(key)
            result = await client.delete(full_key)
            self._stats.deletes += 1
            return result > 0
        except Exception as e:
            self._stats.errors += 1
            logger.warning(f"Redis delete error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        try:
            client = self._get_client()
            full_key = self._make_key(key)
            return await client.exists(full_key) > 0
        except Exception as e:
            self._stats.errors += 1
            logger.warning(f"Redis exists error: {e}")
            return False
    
    async def clear(self) -> bool:
        try:
            client = self._get_client()
            keys = []
            async for key in client.scan_iter(match=f"{self.prefix}*"):
                keys.append(key)
            
            if keys:
                await client.delete(*keys)
            return True
        except Exception as e:
            self._stats.errors += 1
            logger.warning(f"Redis clear error: {e}")
            return False
    
    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None
    
    def get_stats(self) -> CacheStats:
        return self._stats


class LocalCacheBackend(CacheBackend):
    def __init__(
        self,
        maxsize: int = 10000,
        default_ttl: int = 86400,
    ):
        self.maxsize = maxsize
        self.default_ttl = default_ttl
        self._cache: Dict[str, tuple[bytes, float, float]] = {}
        self._stats = CacheStats()
        self._access_order: List[str] = []
    
    def _evict_if_needed(self) -> None:
        import time
        current_time = time.time()
        
        expired_keys = [
            k for k, (_, expire_at, _) in self._cache.items()
            if expire_at < current_time
        ]
        for k in expired_keys:
            del self._cache[k]
            if k in self._access_order:
                self._access_order.remove(k)
        
        while len(self._cache) > self.maxsize:
            if self._access_order:
                oldest_key = self._access_order.pop(0)
                self._cache.pop(oldest_key, None)
            else:
                break
    
    async def get(self, key: str) -> Optional[bytes]:
        import time
        
        entry = self._cache.get(key)
        if entry is None:
            self._stats.misses += 1
            return None
        
        value, expire_at, _ = entry
        if expire_at < time.time():
            del self._cache[key]
            if key in self._access_order:
                self._access_order.remove(key)
            self._stats.misses += 1
            return None
        
        self._stats.hits += 1
        if key in self._access_order:
            self._access_order.remove(key)
        self._access_order.append(key)
        
        return value
    
    async def set(self, key: str, value: bytes, ttl: Optional[int] = None) -> bool:
        import time
        
        self._evict_if_needed()
        
        ttl = ttl or self.default_ttl
        expire_at = time.time() + ttl
        
        self._cache[key] = (value, expire_at, time.time())
        
        if key in self._access_order:
            self._access_order.remove(key)
        self._access_order.append(key)
        
        self._stats.sets += 1
        return True
    
    async def delete(self, key: str) -> bool:
        if key in self._cache:
            del self._cache[key]
            if key in self._access_order:
                self._access_order.remove(key)
            self._stats.deletes += 1
            return True
        return False
    
    async def exists(self, key: str) -> bool:
        import time
        
        entry = self._cache.get(key)
        if entry is None:
            return False
        
        _, expire_at, _ = entry
        return expire_at >= time.time()
    
    async def clear(self) -> bool:
        self._cache.clear()
        self._access_order.clear()
        return True
    
    def get_stats(self) -> CacheStats:
        return self._stats


class DistributedEmbeddingCache:
    def __init__(
        self,
        backend: CacheBackend,
        enabled: bool = True,
        key_prefix: str = "embed:",
    ):
        self.backend = backend
        self.enabled = enabled
        self.key_prefix = key_prefix
    
    def _make_key(self, content_type: str, content_hash: str) -> str:
        return f"{self.key_prefix}{content_type}:{content_hash}"
    
    def _hash_content(self, content: Union[str, bytes, Dict[str, Any]]) -> str:
        import hashlib
        
        if isinstance(content, str):
            data = content.encode("utf-8")
        elif isinstance(content, bytes):
            data = content
        elif isinstance(content, dict):
            data = json.dumps(content, sort_keys=True).encode("utf-8")
        else:
            data = str(content).encode("utf-8")
        
        return hashlib.sha256(data).hexdigest()
    
    async def get_text_embedding(self, text: str) -> Optional[List[float]]:
        if not self.enabled:
            return None
        
        key = self._make_key("text", self._hash_content(text))
        value = await self.backend.get(key)
        
        if value is None:
            return None
        
        try:
            data = json.loads(value.decode("utf-8"))
            return data.get("vector")
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.warning(f"Failed to decode cached embedding: {e}")
            return None
    
    async def set_text_embedding(
        self,
        text: str,
        vector: List[float],
        dimension: Optional[int] = None,
        ttl: Optional[int] = None,
    ) -> bool:
        if not self.enabled:
            return False
        
        key = self._make_key("text", self._hash_content(text))
        data = json.dumps({
            "vector": vector,
            "dimension": dimension or len(vector),
        })
        
        return await self.backend.set(key, data.encode("utf-8"), ttl=ttl)
    
    async def get_image_embedding(self, image_bytes: bytes) -> Optional[List[float]]:
        if not self.enabled:
            return None
        
        key = self._make_key("image", self._hash_content(image_bytes))
        value = await self.backend.get(key)
        
        if value is None:
            return None
        
        try:
            data = json.loads(value.decode("utf-8"))
            return data.get("vector")
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.warning(f"Failed to decode cached embedding: {e}")
            return None
    
    async def set_image_embedding(
        self,
        image_bytes: bytes,
        vector: List[float],
        dimension: Optional[int] = None,
        ttl: Optional[int] = None,
    ) -> bool:
        if not self.enabled:
            return False
        
        key = self._make_key("image", self._hash_content(image_bytes))
        data = json.dumps({
            "vector": vector,
            "dimension": dimension or len(vector),
        })
        
        return await self.backend.set(key, data.encode("utf-8"), ttl=ttl)
    
    async def get_multimodal_embedding(
        self,
        text: Optional[str],
        image_bytes: Optional[bytes],
    ) -> Optional[List[float]]:
        if not self.enabled:
            return None
        
        content_hash = self._hash_content({
            "text": text or "",
            "image": self._hash_content(image_bytes) if image_bytes else "",
        })
        
        key = self._make_key("multimodal", content_hash)
        value = await self.backend.get(key)
        
        if value is None:
            return None
        
        try:
            data = json.loads(value.decode("utf-8"))
            return data.get("vector")
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.warning(f"Failed to decode cached embedding: {e}")
            return None
    
    async def set_multimodal_embedding(
        self,
        text: Optional[str],
        image_bytes: Optional[bytes],
        vector: List[float],
        dimension: Optional[int] = None,
        ttl: Optional[int] = None,
    ) -> bool:
        if not self.enabled:
            return False
        
        content_hash = self._hash_content({
            "text": text or "",
            "image": self._hash_content(image_bytes) if image_bytes else "",
        })
        
        key = self._make_key("multimodal", content_hash)
        data = json.dumps({
            "vector": vector,
            "dimension": dimension or len(vector),
        })
        
        return await self.backend.set(key, data.encode("utf-8"), ttl=ttl)
    
    async def clear(self) -> bool:
        return await self.backend.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        stats = self.backend.get_stats()
        return {
            "enabled": self.enabled,
            "hits": stats.hits,
            "misses": stats.misses,
            "sets": stats.sets,
            "deletes": stats.deletes,
            "errors": stats.errors,
            "hit_rate": stats.hit_rate,
        }


def create_embedding_cache(
    redis_url: Optional[str] = None,
    use_redis: bool = True,
    local_maxsize: int = 10000,
    default_ttl: int = 86400,
) -> DistributedEmbeddingCache:
    if use_redis and redis_url:
        try:
            backend = RedisCacheBackend(
                redis_url=redis_url,
                prefix="emb:",
                default_ttl=default_ttl,
            )
            return DistributedEmbeddingCache(backend=backend, enabled=True)
        except Exception as e:
            logger.warning(f"Failed to create Redis backend, falling back to local: {e}")
    
    backend = LocalCacheBackend(
        maxsize=local_maxsize,
        default_ttl=default_ttl,
    )
    return DistributedEmbeddingCache(backend=backend, enabled=True)


_distributed_cache: Optional[DistributedEmbeddingCache] = None


def get_distributed_cache() -> DistributedEmbeddingCache:
    global _distributed_cache
    
    if _distributed_cache is not None:
        return _distributed_cache
    
    from app.core.config import settings
    from app.core.vector_config import vector_config
    
    redis_url = settings.redis_url
    use_redis = bool(redis_url)
    
    _distributed_cache = create_embedding_cache(
        redis_url=redis_url,
        use_redis=use_redis,
        local_maxsize=vector_config.EMBEDDING_CACHE_SIZE,
        default_ttl=vector_config.EMBEDDING_CACHE_TTL,
    )
    
    return _distributed_cache
