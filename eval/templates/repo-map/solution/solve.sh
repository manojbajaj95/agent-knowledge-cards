#!/bin/bash
set -euo pipefail

python3 - <<'PY'
from pathlib import Path

path = Path("/app/core/pipeline/steps/sku_normalize.py")
text = path.read_text(encoding="utf-8")
text = text.replace('"EU": "US-"', '"EU": "EU-"', 1)
path.write_text(text, encoding="utf-8")
PY
