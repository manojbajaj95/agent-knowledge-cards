---
id: 00000000-0000-4000-8000-000000000023
createdAt: 2026-08-19T00:00:00.000Z
updatedAt: 2026-08-19T00:00:00.000Z
title: type comments count as uses for unused-import
useWhen: fixing pylint unused-import or type comment false positives
---

Live path: `pylint/checkers/variables.py` (constants may live in `pylint/constants.py`).

A module imported only for a `# type:` comment is used. `unused-import` must not fire on `import abc` / `from abc import ABC` when they appear in type comments. Do not "fix" by deleting the import.
