from app.models import Region, ResidualIncomeResult
from app.services.va_tables import (
    ADDITIONAL_FAMILY_MEMBER_INCREMENT,
    DTI_COMPENSATING_THRESHOLD,
    DTI_RESIDUAL_MULTIPLIER,
    VA_RESIDUAL_INCOME_TABLE_2026,
)


def calculate_dti(monthly_debts: float, monthly_gross_income: float) -> float:
    if monthly_gross_income <= 0:
        raise ValueError("Monthly gross income must be greater than zero.")
    return round((monthly_debts / monthly_gross_income) * 100, 2)


def _baseline_residual_requirement(region: Region, family_size: int) -> float:
    if family_size <= 0:
        raise ValueError("Family size must be greater than zero.")

    table = VA_RESIDUAL_INCOME_TABLE_2026[region]
    if family_size in table:
        return float(table[family_size])

    return float(table[5] + (family_size - 5) * ADDITIONAL_FAMILY_MEMBER_INCREMENT)


def calculate_residual_income(
    *,
    region: Region,
    family_size: int,
    maintenance_and_utilities: float,
    monthly_shelter_expense: float,
    monthly_other_obligations: float,
    net_effective_income: float,
    dti_ratio: float,
) -> ResidualIncomeResult:
    baseline = _baseline_residual_requirement(region, family_size)
    adjusted = baseline * DTI_RESIDUAL_MULTIPLIER if dti_ratio > DTI_COMPENSATING_THRESHOLD else baseline

    actual_residual = (
        net_effective_income
        - maintenance_and_utilities
        - monthly_shelter_expense
        - monthly_other_obligations
    )

    return ResidualIncomeResult(
        baseline_requirement=round(baseline, 2),
        adjusted_requirement=round(adjusted, 2),
        actual_residual_income=round(actual_residual, 2),
        passed=actual_residual >= adjusted,
        reference=(
            "VA Pamphlet 26-7, Chapter 4 (Credit Underwriting): "
            "Residual income requirement with 120% multiplier when DTI exceeds 41%."
        ),
    )
