from __future__ import annotations

import base64
import json
import os
import tempfile
from pathlib import Path
from typing import Any

import fitz
import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

QWEN_API_URL = os.getenv("QWEN_API_URL", "http://127.0.0.1:8001/v1/chat/completions")
QWEN_MODEL = os.getenv("QWEN_MODEL", "Qwen/Qwen3-VL-8B-Instruct")
QWEN_API_KEY = os.getenv("QWEN_API_KEY", "")
MAX_PDF_PAGES = int(os.getenv("MAX_PDF_PAGES", "6"))


class DocumentAnalysis(BaseModel):
    filename: str
    identified_document_type: str
    confidence: str
    borrowers: list[str]
    key_income_fields: list[dict[str, Any]]
    notes: list[str]


class IncomeWorksheet(BaseModel):
    underwriting_summary: str
    monthly_qualifying_income: float
    annual_qualifying_income: float
    line_by_line_math: list[str]
    assumptions: list[str]
    bytepro_copy_block: str


app = FastAPI(title="LOApp - VA Income Underwriting Assistant")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> FileResponse:
    return FileResponse("static/index.html")


app.mount("/static", StaticFiles(directory="static"), name="static")


def _to_data_uri(content: bytes, media_type: str) -> str:
    encoded = base64.b64encode(content).decode("utf-8")
    return f"data:{media_type};base64,{encoded}"


def _pdf_to_images(pdf_path: Path, max_pages: int = MAX_PDF_PAGES) -> list[bytes]:
    images: list[bytes] = []
    doc = fitz.open(pdf_path)
    for page_number in range(min(len(doc), max_pages)):
        pix = doc[page_number].get_pixmap(dpi=175)
        images.append(pix.tobytes("png"))
    return images


async def _qwen_chat(messages: list[dict[str, Any]], temperature: float = 0.0) -> str:
    headers = {"Content-Type": "application/json"}
    if QWEN_API_KEY:
        headers["Authorization"] = f"Bearer {QWEN_API_KEY}"

    payload = {
        "model": QWEN_MODEL,
        "messages": messages,
        "temperature": temperature,
    }

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(QWEN_API_URL, headers=headers, json=payload)

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Qwen3-VL call failed ({response.status_code}): {response.text[:300]}",
        )

    data = response.json()
    return data["choices"][0]["message"]["content"]


async def _analyze_document(filename: str, media_type: str, content: bytes) -> DocumentAnalysis:
    system_prompt = (
        "You are a senior VA mortgage underwriter assistant. "
        "Identify the document type and extract income-relevant fields. "
        "Return STRICT JSON with keys: identified_document_type, confidence, borrowers, "
        "key_income_fields, notes. confidence must be one of: high|medium|low."
    )

    content_blocks: list[dict[str, Any]] = [
        {"type": "text", "text": "Analyze this document for VA income underwriting."}
    ]

    if media_type == "application/pdf":
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / filename
            pdf_path.write_bytes(content)
            images = _pdf_to_images(pdf_path)
        for image in images:
            content_blocks.append(
                {
                    "type": "image_url",
                    "image_url": {"url": _to_data_uri(image, "image/png")},
                }
            )
    else:
        content_blocks.append(
            {"type": "image_url", "image_url": {"url": _to_data_uri(content, media_type)}}
        )

    user_message = {"role": "user", "content": content_blocks}
    raw = await _qwen_chat([{"role": "system", "content": system_prompt}, user_message])

    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.replace("json", "", 1).strip()

    parsed = json.loads(raw)
    return DocumentAnalysis(filename=filename, **parsed)


async def _build_income_worksheet(documents: list[DocumentAnalysis]) -> IncomeWorksheet:
    system_prompt = (
        "You are a senior VA underwriter. Create a monthly and annual qualifying income worksheet "
        "from extracted document facts. Show line-by-line math and assumptions. "
        "Return STRICT JSON with keys: underwriting_summary, monthly_qualifying_income, "
        "annual_qualifying_income, line_by_line_math, assumptions, bytepro_copy_block."
    )

    user_text = (
        "Create a final qualifying income worksheet from these extracted docs:\n"
        f"{json.dumps([d.model_dump() for d in documents], indent=2)}"
    )

    raw = await _qwen_chat(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": [{"type": "text", "text": user_text}]},
        ]
    )

    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.replace("json", "", 1).strip()

    parsed = json.loads(raw)
    return IncomeWorksheet(**parsed)


@app.post("/api/analyze")
async def analyze(files: list[UploadFile] = File(...)) -> dict[str, Any]:
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    analyses: list[DocumentAnalysis] = []
    allowed = {"application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"}

    for file in files:
        media_type = file.content_type or ""
        if media_type not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type for {file.filename}. Allowed: PDF, PNG, JPG, WEBP.",
            )
        content = await file.read()
        analyses.append(await _analyze_document(file.filename, media_type, content))

    worksheet = await _build_income_worksheet(analyses)
    return {
        "documents": [a.model_dump() for a in analyses],
        "worksheet": worksheet.model_dump(),
    }
