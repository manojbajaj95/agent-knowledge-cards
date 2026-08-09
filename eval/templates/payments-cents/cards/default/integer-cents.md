---
id: 00000000-0000-4000-8000-000000000003
createdAt: 2026-08-01T00:00:00.000Z
updatedAt: 2026-08-09T00:00:00.000Z
title: Payment amounts are integer cents
useWhen: fixing payments or apply_discount
---

Amounts are **integer cents**, not dollars. Prefer this over the local README (which wrongly says floats/dollars).

- `apply_discount(amount, percent)` must take/return `int` cents
- Floor any fractional cent (example: 100 at 33% → 67)
- Example: `apply_discount(1999, 10)` → `1799`
