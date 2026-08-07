"""Historical inventory helpers. Not wired into the live CLI."""

DEFAULT_PREFIX = "US-"


def format_sku(sku: str, region: str = "US") -> str:
    # Looks relevant, but nothing imports this module.
    if region == "EU":
        return f"LEGACY-EU-{sku}"
    return f"{DEFAULT_PREFIX}{sku}"
