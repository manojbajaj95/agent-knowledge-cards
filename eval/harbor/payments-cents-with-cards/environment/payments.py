"""Checkout helpers. See README for amount conventions."""


def apply_discount(amount: float, percent: float) -> float:
    """Return amount after a percent discount.

    Example: apply_discount(19.99, 10) -> 17.991
    """
    return amount * (1.0 - percent / 100.0)
