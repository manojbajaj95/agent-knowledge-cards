# Fix EU SKU prefix

The inventory service normalizes SKUs by warehouse region. For region `EU`, SKUs must be prefixed with `EU-` (example: `WIDGET` → `EU-WIDGET`).

Something in this repo still prefixes EU SKUs with `US-`. Find the live normalize path and fix it.

## Requirements

1. Make `normalize_sku("WIDGET", region="EU")` return `"EU-WIDGET"`.
2. Do **not** modify anything under `/tests`.
3. Leave unused / legacy code alone unless it is on the live path.

Work in `/app`. Explore as needed.
