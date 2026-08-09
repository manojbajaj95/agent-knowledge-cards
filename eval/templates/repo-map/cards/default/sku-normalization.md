---
id: 00000000-0000-4000-8000-000000000010
createdAt: 2026-08-01T00:00:00.000Z
updatedAt: 2026-08-09T00:00:00.000Z
title: Live SKU normalize path (skip legacy and decoys)
useWhen: fixing EU SKU prefix or normalize_sku
---

Live code path only:

- Entry: `apps/cli/main.py` → `core.pipeline.steps.sku_normalize.normalize_sku`
- Edit: `core/pipeline/steps/sku_normalize.py` — region prefixes live in `REGION_PREFIX` (EU must be `EU-`)
- Ignore: `legacy/inventory.py` and `decoys/handlers/update_sku.py` (unused dead ends)
