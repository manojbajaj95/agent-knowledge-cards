# Lifecycle

Memory session API: retrieve + format on prompt, reflect follow-up on stop. Core stays host-agnostic. Host envelopes live in [`src/adapters/`](../adapters/).

| Module | Role |
|--------|------|
| `session.ts` | `onSessionPrompt` → `{ text, slugs }` (title-first inject, count/char caps, skipSlugs) / `onSessionStop` (reflect follow-up string) |
| `hook-state.ts` | Session slug set for Claude Code / Codex additive inject dedupe |

Adapters must not import `src/core`. They call this API and wrap host JSON.

Wire hosts with `npx knowcards install <claude-code|cursor|codex>`. Claude Code Stop is `async` + `asyncRewake` (same session after the turn ends). Cursor and Codex Stop stay synchronous continuations.
