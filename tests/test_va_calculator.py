from app.models import Region
from app.services.va_calculator import calculate_dti, calculate_residual_income


def test_dti_calculation() -> None:
    assert calculate_dti(2000, 6000) == 33.33


def test_midwest_family_of_four_baseline() -> None:
    result = calculate_residual_income(
        region=Region.midwest,
        family_size=4,
        maintenance_and_utilities=500,
        monthly_shelter_expense=1700,
        monthly_other_obligations=1200,
        net_effective_income=4500,
        dti_ratio=38,
    )
    assert result.baseline_requirement == 1003
    assert result.adjusted_requirement == 1003


def test_residual_income_multiplier_when_dti_above_41() -> None:
    result = calculate_residual_income(
        region=Region.midwest,
        family_size=4,
        maintenance_and_utilities=500,
        monthly_shelter_expense=1700,
        monthly_other_obligations=1200,
        net_effective_income=4500,
        dti_ratio=45,
    )
    assert result.adjusted_requirement == 1203.6
