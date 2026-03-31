# LOApp - VA Income Underwriter Workbench

A local web app that lets processors/LOs drag-and-drop PDFs or images, sends them to a local Qwen3-VL instance for document understanding, and returns a transparent VA-style income worksheet with line-by-line math and a BytePro-ready copy block.

## Features

- Drag/drop UI for PDF and image uploads
- Per-document identification and extraction of income-relevant fields
- Senior-underwriter style qualifying-income worksheet with assumptions and math shown
- BytePro LOS copy block with one-click copy
- API endpoint that can connect to a local OpenAI-compatible Qwen3-VL service

## Tech Stack

- FastAPI backend (`app/main.py`)
- Static frontend (`static/index.html`, `static/app.js`, `static/styles.css`)
- Qwen3-VL via OpenAI-compatible chat API

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Open `http://127.0.0.1:8080`.

## Environment variables

- `QWEN_API_URL` (default: `http://127.0.0.1:8001/v1/chat/completions`)
- `QWEN_MODEL` (default: `Qwen/Qwen3-VL-8B-Instruct`)
- `QWEN_API_KEY` (optional)
- `MAX_PDF_PAGES` (default: `6`)

## Notes

- This MVP delegates document interpretation and income logic to the model prompts. For production use, add schema validation, explicit VA residual-income checks, and human-in-the-loop review states.
- Keep all AI processing local or within your controlled environment for borrower data privacy.
