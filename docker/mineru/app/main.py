from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.parser import MinerUParser

app = FastAPI(title="MinerU PDF Parse Service", version="1.0.0")


class ParseRequest(BaseModel):
    pdf_path: str
    output_dir: str | None = None


class ParseResponse(BaseModel):
    pdf_path: str
    output_dir: str
    result_file: str | None = None
    result_type: str | None = None
    result_content: dict | str | None = None
    stdout: str = ""
    stderr: str = ""


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/parse", response_model=ParseResponse)
async def parse_pdf(request: ParseRequest):
    try:
        result = MinerUParser.parse(request.pdf_path, request.output_dir)
        return ParseResponse(**result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
