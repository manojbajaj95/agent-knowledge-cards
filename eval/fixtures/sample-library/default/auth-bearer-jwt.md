---
id: 00000000-0000-4000-8000-000000000001
createdAt: 2026-08-01T00:00:00.000Z
updatedAt: 2026-08-01T00:00:00.000Z
title: Auth uses Bearer JWT and rt cookie
useWhen: editing auth middleware
---

Session tokens live in the `Authorization` header as Bearer JWTs; refresh tokens are httpOnly cookies named `rt`.
