import sys
from pathlib import Path

sys.path.insert(0, "/app")

from core.pipeline.steps.sku_normalize import normalize_sku


def test_eu_prefix() -> None:
    assert normalize_sku("WIDGET", region="EU") == "EU-WIDGET"


def test_us_unchanged() -> None:
    assert normalize_sku("WIDGET", region="US") == "US-WIDGET"


def test_live_module_fixed_not_decoy() -> None:
    live = Path("/app/core/pipeline/steps/sku_normalize.py").read_text(encoding="utf-8")
    assert '"EU": "EU-"' in live
    # Fixing only the decoy must not pass.
    decoy = Path("/app/decoys/handlers/update_sku.py").read_text(encoding="utf-8")
    assert "REGION_PREFIX" in decoy
