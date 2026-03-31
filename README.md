# VAForge

**Tagline:** *Ocrolus for VA loans — built by veterans, for veterans.*

VAForge is an API-first VA underwriting intelligence platform focused on VA-specific rules, document ingestion, extraction, and underwriting recommendations.

## Current Phase (Phase 1)

This initial build includes:

1. Project structure for API, rules, pipeline, storage, security, and RAG modules.
2. Core VA residual income calculator with 2026 regional tables.
3. DTI calculator and rules engine for Approve / Refer / Decline recommendations.
4. Starter document ingestion API with lightweight classification/extraction.
5. Unit tests for residual income + extraction logic.
6. Docker + docker-compose for local deployment.

## Architecture (MVP)

- **Backend:** FastAPI (Python 3.11+)
- **Rules:** Modular VA rules engine (`app/services/rules_engine.py`)
- **Calculator:** Residual income + DTI logic (`app/services/va_calculator.py`)
- **Pipeline:** Ingestion/classification/extraction stubs (`app/pipeline/`)
- **Data services:** PostgreSQL + Redis (compose ready)

## Quick Start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn app.main:app --reload
```

API docs: `http://localhost:8000/docs`

## Docker

```bash
docker compose up --build
```

## Key Endpoints

### 1) Document Ingestion & Classification
`POST /api/v1/documents/ingest`

Payload example:

```json
{
  "documents": [
    {"file_name": "march_bank_statement.pdf", "mime_type": "application/pdf", "content_text": "Deposit $1250"},
    {"file_name": "borrower_les.pdf", "mime_type": "application/pdf", "content_text": "Gross Pay $5500"}
  ]
}
```

### 2) Underwriting Decision
`POST /api/v1/underwriting/decision`

Payload example:

```json
{
  "borrower_name": "Alex Veteran",
  "loan_amount": 450000,
  "region": "midwest",
  "family_size": 4,
  "monthly_gross_income": 7000,
  "monthly_net_effective_income": 6200,
  "monthly_debt_obligations": 2600,
  "monthly_shelter_expense": 2100,
  "maintenance_and_utilities": 500,
  "occupancy_intent": "primary",
  "transaction_type": "purchase",
  "has_valid_coe": true,
  "va_disability_income": 300
}
```

## Environment Variables

Copy `.env.example` and adapt as needed.

- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string.
- `STORAGE_BACKEND`: `local` or `s3` (future).
- `LOCAL_STORAGE_PATH`: Local encrypted file storage path.
- `ENCRYPTION_KEY`: Key for encryption layer integration.

## VA Guidelines + RAG Update Workflow (next phase)

1. Place latest VA Lender's Handbook PDF under `data/guidelines/`.
2. Run ingestion script (to be implemented in `scripts/load_va_handbook.py`).
3. Rebuild vector index and version the guideline metadata.
4. Update `app/services/va_tables.py` if VA residual table changes.

## Testing

```bash
pytest
```

## Next Phase Roadmap

1. Integrate Unstructured + OCR stack (PaddleOCR/EasyOCR + Layout-aware model).
2. Add RAG-backed citation of exact VA handbook sections.
3. Add fraud/anomaly scoring from bank-statement transaction streams.
4. Generate JSON + PDF underwriting report artifacts.
5. Add auth, audit logs, PII redaction, and multi-tenant isolation.
