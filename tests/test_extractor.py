from app.pipeline.extractor import extract_underwriting_fields


def test_extract_income_and_large_deposits() -> None:
    text = """
    Gross Pay $5,500.00
    Net Pay $4,100.00
    Deposit $1,250.00
    Deposit $850.00
    """
    result = extract_underwriting_fields(text)
    assert result.gross_income == 5500.00
    assert result.net_income == 4100.00
    assert result.large_deposits_detected == 1
