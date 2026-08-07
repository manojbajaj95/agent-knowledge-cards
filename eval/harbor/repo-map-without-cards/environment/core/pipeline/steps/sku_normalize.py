"""Live SKU normalization used by the CLI and services."""

# BUG: EU incorrectly maps to US-
REGION_PREFIX = {
    "US": "US-",
    "EU": "US-",
    "APAC": "AP-",
}


def normalize_sku(sku: str, region: str = "US") -> str:
    prefix = REGION_PREFIX.get(region.upper(), "")
    if sku.startswith(prefix):
        return sku
    return f"{prefix}{sku}"
