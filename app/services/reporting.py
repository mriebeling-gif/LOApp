from app.models import ResidualIncomeResult, UnderwritingDecisionRequest, UnderwritingReport
from app.services.rules_engine import evaluate_va_rules


def build_underwriting_report(
    payload: UnderwritingDecisionRequest,
    dti_ratio: float,
    residual: ResidualIncomeResult,
) -> UnderwritingReport:
    decision, flags, factors = evaluate_va_rules(payload, dti_ratio, residual)
    explanation = (
        f"Decision: {decision}. DTI={dti_ratio:.2f}%. "
        f"Residual income={residual.actual_residual_income:.2f} vs required {residual.adjusted_requirement:.2f}."
    )
    return UnderwritingReport(
        decision=decision,
        rule_flags=flags,
        compensating_factors=factors,
        explanation=explanation,
    )
