---
id: 00000000-0000-4000-8000-000000000022
createdAt: 2026-08-19T00:00:00.000Z
updatedAt: 2026-08-19T00:00:00.000Z
title: Binary PUT bodies must not go through to_native_string
useWhen: fixing requests PUT or binary payload encoding
---

Live path: `requests/models.py`.

A `PUT`/`POST` body that is already `bytes` must stay bytes. Do not run `to_native_string` on binary payloads (that broke `data=u"ööö".encode("utf-8")` in 2.9). Ignore tests under `test_requests.py` until the model path is fixed.
