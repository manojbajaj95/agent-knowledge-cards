# Lifecycle

Thin host edges for session and message injection. Core stays host-agnostic.

Shared inject wording lives in [`src/core/inject.ts`](../core/inject.ts) (`formatCardsForInject`, trust reminder).

| Module | Role |
|--------|------|
| `session.ts` | SessionStart inject / Stop reflect stubs (reflect TODO) |
| `messages.ts` | Insert trusted-memory block into a chat message list |

## TODOs

- Wire real Cursor session hooks
- Continual-learning-bench message-list wiring
