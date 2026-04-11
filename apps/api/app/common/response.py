from typing import Any
from fastapi.responses import JSONResponse


def success_response(data: Any = None, message: str = "success", trace_id: str = ""):
    return JSONResponse(
        status_code=200,
        content={
            "code": 0,
            "message": message,
            "data": data,
            "trace_id": trace_id,
        },
    )


def error_response(code: int, message: str, trace_id: str = "", status_code: int = 400):
    return JSONResponse(
        status_code=status_code,
        content={
            "code": code,
            "message": message,
            "data": None,
            "trace_id": trace_id,
        },
    )