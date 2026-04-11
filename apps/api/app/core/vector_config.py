from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Literal, Optional
from enum import Enum
import math


class IndexType(str, Enum):
    IVFFLAT = "ivfflat"
    HNSW = "hnsw"
    AUTO = "auto"


class VectorConfig(BaseSettings):
    EMBEDDING_DIM: int = Field(1024, description="默认向量维度 (Qwen3-VL-Embedding-2B MRL裁剪)")
    SUPPORTED_DIMENSIONS: list = Field(
        default_factory=lambda: [256, 512, 1024, 1536, 2048],
        description="支持的向量维度 (MRL动态裁剪)"
    )
    
    MAX_BATCH_SIZE: int = Field(32, description="最大批处理大小 (避免GPU OOM)")
    MIN_BATCH_SIZE: int = Field(1, description="最小批处理大小")
    PREFERRED_BATCH_SIZE: int = Field(16, description="推荐批处理大小")
    
    GPU_MEMORY_THRESHOLD_MB: float = Field(4096.0, description="GPU内存阈值 (MB)")
    BATCH_SIZE_AUTO: bool = Field(True, description="自动调整批处理大小")
    
    EMBEDDING_CACHE_ENABLED: bool = Field(True, description="是否启用嵌入缓存")
    EMBEDDING_CACHE_SIZE: int = Field(10000, description="缓存大小 (LRU)")
    EMBEDDING_CACHE_TTL: int = Field(86400, description="缓存过期时间 (秒)")
    EMBEDDING_CACHE_USE_REDIS: bool = Field(True, description="是否使用Redis分布式缓存")
    
    IVFFLAT_LISTS_MIN: int = Field(10, description="IVFFlat最小lists数")
    IVFFLAT_LISTS_MAX: int = Field(4000, description="IVFFlat最大lists数")
    IVFFLAT_LISTS_RATIO: float = Field(0.01, description="lists = sqrt(rows) 的系数")
    
    HNSW_M: int = Field(32, description="HNSW M参数 (连接数，100W规模推荐32)")
    HNSW_M_MIN: int = Field(4, description="HNSW M最小值")
    HNSW_M_MAX: int = Field(64, description="HNSW M最大值")
    HNSW_EF_CONSTRUCTION: int = Field(128, description="HNSW efConstruction参数 (100W规模推荐128)")
    HNSW_EF_CONSTRUCTION_MIN: int = Field(8, description="HNSW efConstruction最小值")
    HNSW_EF_CONSTRUCTION_MAX: int = Field(256, description="HNSW efConstruction最大值")
    HNSW_EF_SEARCH: int = Field(64, description="HNSW efSearch参数")
    HNSW_EF_SEARCH_MIN: int = Field(8, description="HNSW efSearch最小值")
    HNSW_EF_SEARCH_MAX: int = Field(512, description="HNSW efSearch最大值")
    
    DEFAULT_INDEX_TYPE: IndexType = Field(IndexType.HNSW, description="默认索引类型")
    INDEX_AUTO_OPTIMIZE: bool = Field(True, description="是否自动优化索引参数")
    INDEX_OPTIMIZE_THRESHOLD: int = Field(10000, description="触发索引优化的数据量阈值")
    
    VALIDATE_EMBEDDING_NORM: bool = Field(True, description="验证向量归一化")
    VALIDATE_EMBEDDING_DIM: bool = Field(True, description="验证向量维度")
    VALIDATE_EMBEDDING_ZERO: bool = Field(True, description="检测零向量")
    
    model_config = {"env_prefix": "VECTOR_", "use_enum_values": True}


vector_config = VectorConfig()

def calculate_ivfflat_lists(num_rows: int) -> int:
    if num_rows == 0:
        return vector_config.IVFFLAT_LISTS_MIN
    
    lists = int(math.sqrt(num_rows) * vector_config.IVFFLAT_LISTS_RATIO)
    lists = max(lists, vector_config.IVFFLAT_LISTS_MIN)
    lists = min(lists, vector_config.IVFFLAT_LISTS_MAX)
    
    return lists

def get_optimal_batch_size(
    num_items: int,
    gpu_memory_available_mb: Optional[float] = None,
) -> int:
    if not vector_config.BATCH_SIZE_AUTO:
        return vector_config.PREFERRED_BATCH_SIZE
    
    if gpu_memory_available_mb and gpu_memory_available_mb > 0:
        bytes_per_item = 2048 * 4 * 2
        max_items = int((gpu_memory_available_mb * 1024 * 1024 * 0.5) / bytes_per_item)
        
        batch_size = min(max_items, vector_config.MAX_BATCH_SIZE)
        batch_size = max(batch_size, vector_config.MIN_BATCH_SIZE)
        return batch_size
    
    if num_items <= 10:
        return vector_config.MIN_BATCH_SIZE
    elif num_items <= 100:
        return 8
    elif num_items <= 1000:
        return 16
    else:
        return vector_config.PREFERRED_BATCH_SIZE
