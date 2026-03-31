from fastapi import APIRouter

from app.models import (
    DocumentIngestRequest,
    DocumentIngestResponse,
    UnderwritingDecisionRequest,
    UnderwritingDecisionResponse,
)
from app.pipeline.classifier import classify_documents
from app.pipeline.extractor import extract_underwriting_fields
from app.services.reporting import build_underwriting_report
from app.services.va_calculator import calculate_dti, calculate_residual_income

router = APIRouter(prefix="/api/v1")


@router.post("/documents/ingest", response_model=DocumentIngestResponse)
async def ingest_documents(payload: DocumentIngestRequest) -> DocumentIngestResponse:
    classified = classify_documents(payload.documents)
    extracted = [extract_underwriting_fields(doc.content_text or "") for doc in payload.documents]
    return DocumentIngestResponse(classification_results=classified, extraction_results=extracted)


@router.post("/underwriting/decision", response_model=UnderwritingDecisionResponse)
async def underwriting_decision(
    payload: UnderwritingDecisionRequest,
) -> UnderwritingDecisionResponse:
    dti = calculate_dti(payload.monthly_debt_obligations, payload.monthly_gross_income)
    residual = calculate_residual_income(
        region=payload.region,
        family_size=payload.family_size,
        maintenance_and_utilities=payload.maintenance_and_utilities,
        monthly_shelter_expense=payload.monthly_shelter_expense,
        monthly_other_obligations=payload.monthly_debt_obligations,
        net_effective_income=payload.monthly_net_effective_income,
        dti_ratio=dti,
    )
    report = build_underwriting_report(payload, dti, residual)
    return UnderwritingDecisionResponse(dti=dti, residual_income=residual, report=report)
