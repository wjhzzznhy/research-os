import time
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logger import get_logger

logger = get_logger("trace")


class TraceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        trace_id = uuid4().hex
        request.state.trace_id = trace_id

        start_time = time.time()
        response = await call_next(request)
        duration = round((time.time() - start_time) * 1000, 2)

        response.headers["X-Trace-Id"] = trace_id

        logger.info(
            f"trace_id={trace_id} method={request.method} "
            f"path={request.url.path} status={response.status_code} "
            f"duration_ms={duration}"
        )
        return response