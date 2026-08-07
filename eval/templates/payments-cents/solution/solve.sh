#!/bin/bash
set -euo pipefail

cat >/app/payments.py <<'PY'
"""Checkout helpers. Amounts are integer cents."""


def apply_discount(amount: int, percent: float) -> int:
    """Return amount (integer cents) after a percent discount, floored."""
    return int(amount * (100.0 - percent) / 100.0)
PY

cat >/app/CONVENTION.md <<'MD'
Amounts are integer cents. Never use floating-point dollars for money.
MD
