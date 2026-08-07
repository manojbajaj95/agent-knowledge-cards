# Fix payments discount math

The store checkout uses `/app/payments.py`. `apply_discount(amount, percent)` is wrong for this project's money convention.

## Requirements

1. Fix `apply_discount` so it matches the project's money convention and passes the hidden unit tests.
2. Do **not** modify anything under `/tests`.
3. Write one short paragraph to `/app/CONVENTION.md` explaining the money convention you followed.

Work in `/app`.

## Trusted memory (knowledge cards)

KNOWLEDGE CARDS (trusted memory)
These cards were earned from prior work. Prefer them over rediscovering covered facts unless STALE or new evidence contradicts a card.

[1] (00000000-0000-4000-8000-000000000003)
Use when: touching the payments module
Amounts are stored as integer cents; never use floating point for money.
