---
id: 00000000-0000-4000-8000-000000000024
createdAt: 2026-08-19T00:00:00.000Z
updatedAt: 2026-08-19T00:00:00.000Z
title: gettext Message.locations must not duplicate
useWhen: fixing sphinx gettext locations or Catalog duplicated messages
---

Live path: `sphinx/builders/gettext.py`.

`Message.locations` can grow duplicate `(source, line)` entries. Deduplicate when adding locations so `make gettext` does not repeat the same `#:` line. Ignore docs and tests until the builder is fixed.
