from app.models import CompensatingFactor, ResidualIncomeResult, UnderwritingDecisionRequest


def evaluate_va_rules(
    payload: UnderwritingDecisionRequest,
    dti_ratio: float,
    residual: ResidualIncomeResult,
) -> tuple[str, list[str], list[CompensatingFactor]]:
    flags: list[str] = []
    factors: list[CompensatingFactor] = []

    if not payload.has_valid_coe:
        flags.append("Missing/invalid COE (VA Pamphlet 26-7 Chapter 2).")

    if payload.occupancy_intent.lower() != "primary":
        flags.append("Occupancy appears non-compliant for VA loan purpose (Chapter 3).")

    if dti_ratio > 41:
        flags.append("DTI above 41%; compensating factors required (Chapter 4).")
        if payload.va_disability_income > 0:
            factors.append(
                CompensatingFactor(
                    factor="VA disability income",
                    rationale="Stable tax-free income can strengthen repayment capacity.",
                )
            )
        if residual.actual_residual_income >= residual.adjusted_requirement:
            factors.append(
                CompensatingFactor(
                    factor="Strong residual income",
                    rationale="Residual income meets 120% benchmark when DTI is above 41%.",
                )
            )

    if not residual.passed:
        flags.append("Residual income below guideline threshold (Chapter 4).")

    if flags and (not residual.passed or not payload.has_valid_coe):
        decision = "Decline"
    elif flags:
        decision = "Refer"
    else:
        decision = "Approve"

    return decision, flags, factors
