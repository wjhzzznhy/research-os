import io
import logging
import struct
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple, Union

from PIL import Image
from PIL.ExifTags import TAGS

logger = logging.getLogger(__name__)


class FileType(Enum):
    PNG = "png"
    JPEG = "jpeg"
    GIF = "gif"
    WEBP = "webp"
    BMP = "bmp"
    SVG = "svg"
    PDF = "pdf"
    UNKNOWN = "unknown"


MAGIC_NUMBERS: Dict[bytes, FileType] = {
    b"\x89PNG\r\n\x1a\n": FileType.PNG,
    b"\xff\xd8\xff": FileType.JPEG,
    b"GIF87a": FileType.GIF,
    b"GIF89a": FileType.GIF,
    b"RIFF": FileType.WEBP,
    b"BM": FileType.BMP,
    b"%PDF": FileType.PDF,
}

MIME_TYPE_MAP: Dict[FileType, str] = {
    FileType.PNG: "image/png",
    FileType.JPEG: "image/jpeg",
    FileType.GIF: "image/gif",
    FileType.WEBP: "image/webp",
    FileType.BMP: "image/bmp",
    FileType.SVG: "image/svg+xml",
    FileType.PDF: "application/pdf",
    FileType.UNKNOWN: "application/octet-stream",
}

FILE_EXTENSION_MAP: Dict[FileType, List[str]] = {
    FileType.PNG: [".png"],
    FileType.JPEG: [".jpg", ".jpeg"],
    FileType.GIF: [".gif"],
    FileType.WEBP: [".webp"],
    FileType.BMP: [".bmp"],
    FileType.SVG: [".svg"],
    FileType.PDF: [".pdf"],
}


@dataclass
class ValidationResult:
    is_valid: bool
    file_type: FileType
    mime_type: str
    error_message: Optional[str] = None
    sanitized_content: Optional[bytes] = None
    metadata: Optional[Dict] = None


@dataclass
class ImageMetadata:
    width: int
    height: int
    format: str
    mode: str
    has_exif: bool
    has_transparency: bool
    color_profile: Optional[str] = None


class FileValidator:
    MAX_HEADER_SIZE: int = 32
    MAX_IMAGE_DIMENSION: int = 16384
    MIN_IMAGE_DIMENSION: int = 1
    MAX_IMAGE_PIXELS: int = 178_956_970
    
    def __init__(
        self,
        max_file_size: int = 10 * 1024 * 1024,
        max_image_dimension: int = 16384,
        allowed_types: Optional[List[FileType]] = None,
        strip_metadata: bool = True,
    ):
        self.max_file_size = max_file_size
        self.max_image_dimension = max_image_dimension
        self.allowed_types = allowed_types or [
            FileType.PNG,
            FileType.JPEG,
            FileType.GIF,
            FileType.WEBP,
            FileType.BMP,
        ]
        self.strip_metadata = strip_metadata
        
        Image.MAX_IMAGE_PIXELS = self.MAX_IMAGE_PIXELS
    
    def detect_file_type(self, header: bytes) -> FileType:
        for magic, file_type in MAGIC_NUMBERS.items():
            if header.startswith(magic):
                return file_type
        
        if b"<?xml" in header[:100] or b"<svg" in header[:100]:
            return FileType.SVG
        
        return FileType.UNKNOWN
    
    def validate_magic_number(
        self,
        content: bytes,
        declared_type: Optional[str] = None,
    ) -> Tuple[bool, FileType, Optional[str]]:
        if len(content) < 2:
            return False, FileType.UNKNOWN, "文件内容过短"
        
        header = content[:self.MAX_HEADER_SIZE]
        detected_type = self.detect_file_type(header)
        
        if detected_type == FileType.UNKNOWN:
            return False, FileType.UNKNOWN, "无法识别文件类型"
        
        if declared_type:
            declared_lower = declared_type.lower()
            if detected_type == FileType.JPEG:
                if declared_lower not in ["image/jpeg", "image/jpg"]:
                    return False, detected_type, f"文件类型不匹配: 声明为 {declared_type}, 实际为 {MIME_TYPE_MAP[detected_type]}"
            elif detected_type == FileType.WEBP:
                if header[:4] == b"RIFF" and len(content) >= 12:
                    if content[8:12] != b"WEBP":
                        return False, detected_type, "无效的WebP文件格式"
                if declared_lower != "image/webp":
                    return False, detected_type, f"文件类型不匹配: 声明为 {declared_type}, 实际为 {MIME_TYPE_MAP[detected_type]}"
            else:
                expected_mime = MIME_TYPE_MAP.get(detected_type, "")
                if declared_lower != expected_mime.lower():
                    logger.warning(
                        f"File type mismatch: declared={declared_type}, detected={expected_mime}"
                    )
        
        return True, detected_type, None
    
    def validate_file_size(
        self,
        content: bytes,
        declared_size: Optional[int] = None,
    ) -> Tuple[bool, Optional[str]]:
        actual_size = len(content)
        
        if actual_size == 0:
            return False, "文件为空"
        
        if actual_size > self.max_file_size:
            return False, f"文件大小超过限制: {actual_size} > {self.max_file_size} bytes"
        
        if declared_size is not None and actual_size != declared_size:
            logger.warning(
                f"File size mismatch: declared={declared_size}, actual={actual_size}"
            )
            return False, f"文件大小不匹配: 声明 {declared_size} bytes, 实际 {actual_size} bytes"
        
        return True, None
    
    def validate_image_dimensions(
        self,
        image: Image.Image,
    ) -> Tuple[bool, Optional[str]]:
        width, height = image.size
        
        if width < self.MIN_IMAGE_DIMENSION or height < self.MIN_IMAGE_DIMENSION:
            return False, f"图片尺寸过小: {width}x{height}"
        
        if width > self.max_image_dimension or height > self.max_image_dimension:
            return False, f"图片尺寸超过限制: {width}x{height} > {self.max_image_dimension}"
        
        total_pixels = width * height
        if total_pixels > self.MAX_IMAGE_PIXELS:
            return False, f"图片像素数超过安全限制: {total_pixels}"
        
        return True, None
    
    def extract_image_metadata(self, image: Image.Image) -> ImageMetadata:
        has_exif = False
        try:
            exif = image._getexif()
            if exif:
                has_exif = any(tag for tag in exif.keys())
        except (AttributeError, KeyError, IndexError):
            pass
        
        color_profile = None
        if "icc_profile" in image.info:
            color_profile = "ICC"
        
        return ImageMetadata(
            width=image.width,
            height=image.height,
            format=image.format or "UNKNOWN",
            mode=image.mode,
            has_exif=has_exif,
            has_transparency=image.mode in ("RGBA", "LA", "P"),
            color_profile=color_profile,
        )
    
    def strip_image_metadata(self, image: Image.Image) -> Image.Image:
        clean_info = {}
        
        if image.mode == "P":
            if "transparency" in image.info:
                clean_info["transparency"] = image.info["transparency"]
        
        if image.mode in ("RGBA", "LA"):
            clean_image = image
        else:
            clean_image = image.copy()
        
        clean_image.info = clean_info
        
        return clean_image
    
    def sanitize_image(
        self,
        content: bytes,
        file_type: FileType,
    ) -> Tuple[Optional[bytes], Optional[ImageMetadata], Optional[str]]:
        try:
            image = Image.open(io.BytesIO(content))
            image.load()
        except Exception as e:
            return None, None, f"无法解析图片: {str(e)}"
        
        is_valid, error = self.validate_image_dimensions(image)
        if not is_valid:
            return None, None, error
        
        original_metadata = self.extract_image_metadata(image)
        
        if self.strip_metadata:
            clean_image = self.strip_image_metadata(image)
        else:
            clean_image = image
        
        output = io.BytesIO()
        
        save_format = file_type.name if file_type != FileType.JPEG else "JPEG"
        
        save_kwargs = {}
        if save_format == "PNG":
            save_kwargs["optimize"] = True
        elif save_format == "JPEG":
            save_kwargs["quality"] = 95
            save_kwargs["optimize"] = True
        elif save_format == "WEBP":
            save_kwargs["quality"] = 95
        elif save_format == "GIF":
            pass
        
        try:
            clean_image.save(output, format=save_format, **save_kwargs)
            sanitized_content = output.getvalue()
        except Exception as e:
            logger.warning(f"Failed to sanitize image, using original: {e}")
            sanitized_content = content
        
        return sanitized_content, original_metadata, None
    
    def validate_upload(
        self,
        content: bytes,
        declared_content_type: Optional[str] = None,
        declared_size: Optional[int] = None,
        sanitize: bool = True,
    ) -> ValidationResult:
        is_valid, error = self.validate_file_size(content, declared_size)
        if not is_valid:
            return ValidationResult(
                is_valid=False,
                file_type=FileType.UNKNOWN,
                mime_type="application/octet-stream",
                error_message=error,
            )
        
        is_valid, file_type, error = self.validate_magic_number(
            content, declared_content_type
        )
        if not is_valid:
            return ValidationResult(
                is_valid=False,
                file_type=file_type,
                mime_type=MIME_TYPE_MAP.get(file_type, "application/octet-stream"),
                error_message=error,
            )
        
        if file_type not in self.allowed_types:
            return ValidationResult(
                is_valid=False,
                file_type=file_type,
                mime_type=MIME_TYPE_MAP.get(file_type, "application/octet-stream"),
                error_message=f"不支持的文件类型: {file_type.value}",
            )
        
        sanitized_content = content
        metadata = None
        
        if file_type in [FileType.PNG, FileType.JPEG, FileType.GIF, FileType.WEBP, FileType.BMP]:
            if sanitize:
                sanitized_content, image_metadata, error = self.sanitize_image(
                    content, file_type
                )
                if error:
                    return ValidationResult(
                        is_valid=False,
                        file_type=file_type,
                        mime_type=MIME_TYPE_MAP.get(file_type, "application/octet-stream"),
                        error_message=error,
                    )
                if image_metadata:
                    metadata = {
                        "width": image_metadata.width,
                        "height": image_metadata.height,
                        "format": image_metadata.format,
                        "mode": image_metadata.mode,
                        "had_exif": image_metadata.has_exif,
                        "had_transparency": image_metadata.has_transparency,
                    }
        
        return ValidationResult(
            is_valid=True,
            file_type=file_type,
            mime_type=MIME_TYPE_MAP.get(file_type, "application/octet-stream"),
            sanitized_content=sanitized_content,
            metadata=metadata,
        )


file_validator = FileValidator()
