# Fix payments discount math

The store checkout uses `/app/payments.py`. `apply_discount(amount, percent)` is wrong for this project's money convention.

## Requirements

1. Fix `apply_discount` so it matches the project's money convention and passes the hidden unit tests.
2. Do **not** modify anything under `/tests`.
3. Write one short paragraph to `/app/CONVENTION.md` explaining the money convention you followed.

Work in `/app`.
