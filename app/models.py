from dataclasses import dataclass, field
from enum import Enum


class Region(str, Enum):
    northeast = "northeast"
    midwest = "midwest"
    south = "south"
    west = "west"


@dataclass
class DocumentPayload:
    file_name: str
    mime_type: str
    content_text: str | None = None


@dataclass
class DocumentClassificationResult:
    file_name: str
    category: str
    confidence: float


@dataclass
class DocumentExtractionResult:
    gross_income: float | None = None
    net_income: float | None = None
    large_deposits_detected: int = 0


@dataclass
class DocumentIngestRequest:
    documents: list[DocumentPayload]


@dataclass
class DocumentIngestResponse:
    classification_results: list[DocumentClassificationResult]
    extraction_results: list[DocumentExtractionResult]


@dataclass
class UnderwritingDecisionRequest:
    borrower_name: str
    loan_amount: float
    region: Region
    family_size: int
    monthly_gross_income: float
    monthly_net_effective_income: float
    monthly_debt_obligations: float
    monthly_shelter_expense: float
    maintenance_and_utilities: float = 0
    occupancy_intent: str = "primary"
    transaction_type: str = "purchase"
    has_valid_coe: bool = True
    va_disability_income: float = 0


@dataclass
class ResidualIncomeResult:
    baseline_requirement: float
    adjusted_requirement: float
    actual_residual_income: float
    passed: bool
    reference: str


@dataclass
class CompensatingFactor:
    factor: str
    rationale: str


@dataclass
class UnderwritingReport:
    decision: str
    rule_flags: list[str] = field(default_factory=list)
    compensating_factors: list[CompensatingFactor] = field(default_factory=list)
    explanation: str = ""


@dataclass
class UnderwritingDecisionResponse:
    dti: float
    residual_income: ResidualIncomeResult
    report: UnderwritingReport
