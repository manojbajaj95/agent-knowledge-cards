"""CLI entry for inventory tooling."""

from core.pipeline.steps.sku_normalize import normalize_sku


def main(sku: str, region: str) -> str:
    return normalize_sku(sku, region=region)


if __name__ == "__main__":
    import sys

    print(main(sys.argv[1], sys.argv[2]))
