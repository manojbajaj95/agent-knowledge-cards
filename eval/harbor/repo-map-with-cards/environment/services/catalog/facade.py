"""Public catalog facade (re-exports only)."""

from core.pipeline.steps.sku_normalize import normalize_sku

__all__ = ["normalize_sku"]
