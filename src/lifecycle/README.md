# Lifecycle

Thin host edges for session inject and reflect follow-up text. Core stays host-agnostic.

Shared inject wording lives in [`src/core/inject.ts`](../core/inject.ts). Reflection prompt loading lives in [`src/core/reflection.ts`](../core/reflection.ts). Host envelopes live in [`src/adapters/`](../adapters/).

| Module | Role |
|--------|------|
| `session.ts` | `onSessionPrompt` (title-first inject, count/char caps, skipSlugs) / `onSessionStop` (reflect follow-up string) |
| `hook-state.ts` | Session slug set for Claude Code / Codex additive inject dedupe |

Wire hosts with `npx knowcards install <claude-code|cursor|codex>`. Claude Code Stop is `async` + `asyncRewake` (same session after the turn ends). Cursor and Codex Stop stay synchronous continuations.
