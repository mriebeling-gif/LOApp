import re

from app.models import DocumentExtractionResult

CURRENCY_REGEX = re.compile(r"\$?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)")


def _to_float(raw: str) -> float:
    return float(raw.replace(",", ""))


def extract_underwriting_fields(text: str) -> DocumentExtractionResult:
    gross_income = None
    net_income = None
    large_deposits_detected = 0

    for line in text.splitlines():
        lower = line.lower()
        match = CURRENCY_REGEX.search(line)
        if not match:
            continue
        value = _to_float(match.group(1))

        if "gross" in lower and gross_income is None:
            gross_income = value
        if "net" in lower and net_income is None:
            net_income = value
        if "deposit" in lower and value >= 1000:
            large_deposits_detected += 1

    return DocumentExtractionResult(
        gross_income=gross_income,
        net_income=net_income,
        large_deposits_detected=large_deposits_detected,
    )
