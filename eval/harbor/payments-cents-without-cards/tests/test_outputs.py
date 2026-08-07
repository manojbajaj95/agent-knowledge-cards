import sys
from pathlib import Path

# Harbor runs pytest from /tests; the agent workspace is /app.
sys.path.insert(0, "/app")

from payments import apply_discount


def test_discount_uses_integer_cents() -> None:
    # 1999 cents ($19.99) at 10% off -> 1799 cents
    result = apply_discount(1999, 10)
    assert result == 1799
    assert isinstance(result, int)


def test_discount_floors_fractional_cents() -> None:
    # 100 cents at 33% off -> 67 cents (floor)
    result = apply_discount(100, 33)
    assert result == 67
    assert isinstance(result, int)


def test_convention_note_mentions_cents() -> None:
    text = Path("/app/CONVENTION.md").read_text(encoding="utf-8").lower()
    assert "cent" in text
