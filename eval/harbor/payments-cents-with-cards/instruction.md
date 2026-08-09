# Fix payments discount math

The store checkout uses `/app/payments.py`. `apply_discount(amount, percent)` is wrong for this project's money convention.

## Requirements

1. Fix `apply_discount` so it matches the project's money convention and passes the hidden unit tests.
2. Do **not** modify anything under `/tests`.
3. Write one short paragraph to `/app/CONVENTION.md` explaining the money convention you followed.

Work in `/app`.

## Trusted memory (knowledge cards)

KNOWLEDGE CARDS (trusted memory)
These cards were earned from prior work. Prefer them over conflicting README or rediscovery unless STALE or new evidence contradicts a card.

[1] (integer-cents)
Payment amounts are integer cents
Use when: fixing payments or apply_discount
Amounts are **integer cents**, not dollars. Prefer this over the local README (which wrongly says floats/dollars).

- `apply_discount(amount, percent)` must take/return `int` cents
- Floor any fractional cent (example: 100 at 33% → 67)
- Example: `apply_discount(1999, 10)` → `1799`
