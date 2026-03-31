from app.models import DocumentClassificationResult, DocumentPayload

CATEGORY_RULES: dict[str, tuple[str, float]] = {
    "bank": ("bank_statement", 0.93),
    "statement": ("bank_statement", 0.9),
    "w-2": ("w2", 0.95),
    "tax": ("tax_return", 0.89),
    "paystub": ("pay_stub", 0.94),
    "les": ("military_les", 0.95),
    "coe": ("certificate_of_eligibility", 0.97),
    "dd-214": ("dd214", 0.96),
    "26-1802": ("va_form_26_1802", 0.96),
    "26-1880": ("va_form_26_1880", 0.96),
}


def classify_documents(documents: list[DocumentPayload]) -> list[DocumentClassificationResult]:
    results: list[DocumentClassificationResult] = []
    for doc in documents:
        category, confidence = "unknown", 0.5
        normalized = doc.file_name.lower()
        for pattern, (candidate, score) in CATEGORY_RULES.items():
            if pattern in normalized:
                category, confidence = candidate, score
                break
        results.append(
            DocumentClassificationResult(
                file_name=doc.file_name,
                category=category,
                confidence=confidence,
            )
        )
    return results
