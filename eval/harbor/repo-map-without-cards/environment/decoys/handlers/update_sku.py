"""Experiment: SKU update handler. Not imported by apps/cli."""

REGION_PREFIX = {
    "US": "US-",
    "EU": "US-",  # tempting to "fix" here — this path is unused
}


def update_sku(sku: str, region: str) -> str:
    return REGION_PREFIX.get(region, "") + sku
