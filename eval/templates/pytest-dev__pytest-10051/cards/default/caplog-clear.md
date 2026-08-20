---
id: 00000000-0000-4000-8000-000000000021
createdAt: 2026-08-19T00:00:00.000Z
updatedAt: 2026-08-19T00:00:00.000Z
title: caplog.clear must keep get_records on the same list
useWhen: fixing pytest caplog clear or get_records
---

Live path: `src/_pytest/logging.py`.

`caplog.get_records()` and `caplog.records` must stay the same list after `caplog.clear()`. Do not replace the handler's `records` list (that freezes `get_records`). Clear the existing list in place. Ignore test files under `testing/`.
