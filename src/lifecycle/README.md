# Lifecycle

Thin host edges for session inject and reflect follow-up text. Core stays host-agnostic.

Shared inject wording lives in [`src/core/inject.ts`](../core/inject.ts). Reflection prompt loading lives in [`src/core/reflection.ts`](../core/reflection.ts). Host envelopes live in [`src/adapters/`](../adapters/).

| Module | Role |
|--------|------|
| `session.ts` | `onSessionPrompt` (retrieve + inject, count and char caps) / `onSessionStop` (reflect follow-up string) |

Wire hosts with `npx knowcards install <claude-code|cursor|codex>`.
