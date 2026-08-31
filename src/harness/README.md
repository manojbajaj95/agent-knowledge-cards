# Harness

Session API: fetch on prompt, reflect follow-up on stop. Memory stays host-agnostic in [`src/memory/`](../memory/). Host envelopes live in [`src/adapters/`](../adapters/).

| Module | Role |
|--------|------|
| `fetch.ts` | `fetchCards` → `{ text, slugs }` (title-first format, count/char caps, skipSlugs) |
| `reflect.ts` | `reflectFollowup` (REFLECT.md or packaged default) |
| `hook-state.ts` | Session slug set for additive fetch dedupe; mutation fingerprint so Stop does not re-extract the same edits |

Adapters must not import `src/memory`. They call this API and wrap host JSON.

Wire hosts with `npx knowcards install <claude-code|cursor|codex|pi>`. Claude Code Stop is `async` + `asyncRewake` (same session after the turn ends). Cursor and Codex Stop stay synchronous continuations. Pi reflects on `session_shutdown` (follow-up at session end, including print/JSON).
