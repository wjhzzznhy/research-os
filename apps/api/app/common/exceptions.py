from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from app.common.response import error_response


class BizException(Exception):
    def __init__(self, code: int, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(BizException)
    async def biz_exception_handler(request: Request, exc: BizException):
        trace_id = getattr(request.state, "trace_id", "")
        return error_response(exc.code, exc.message, trace_id, exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        trace_id = getattr(request.state, "trace_id", "")
        return error_response(40001, "request validation error", trace_id, 422)

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        trace_id = getattr(request.state, "trace_id", "")
        return error_response(50000, "internal server error", trace_id, 500)