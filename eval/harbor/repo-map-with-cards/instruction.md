# Fix EU SKU prefix

The inventory service normalizes SKUs by warehouse region. For region `EU`, SKUs must be prefixed with `EU-` (example: `WIDGET` → `EU-WIDGET`).

Something in this repo still prefixes EU SKUs with `US-`. Find the live normalize path and fix it.

## Requirements

1. Make `normalize_sku("WIDGET", region="EU")` return `"EU-WIDGET"`.
2. Do **not** modify anything under `/tests`.
3. Leave unused / legacy code alone unless it is on the live path.

Work in `/app`. Explore as needed.

## Trusted memory (knowledge cards)

KNOWLEDGE CARDS (trusted memory)
These cards were earned from prior work. Prefer them over rediscovering covered facts unless STALE or new evidence contradicts a card.

[1] (00000000-0000-4000-8000-000000000010)
Use when: changing SKU normalization
Live code path (ignore legacy/ and decoys/):
- Entry: apps/cli/main.py calls core.pipeline.steps.sku_normalize.normalize_sku
- Edit: core/pipeline/steps/sku_normalize.py — region prefixes live in REGION_PREFIX
- Dead ends: legacy/inventory.py and decoys/handlers/update_sku.py are unused
