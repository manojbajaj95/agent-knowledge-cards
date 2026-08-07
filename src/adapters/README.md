# Adapters

Thin edges around `src/core`. Core stays host-agnostic; adapters talk to harnesses.

| Adapter | Role |
|---------|------|
| `custom-harness.ts` | `formatCardsForInject`, message-list injection |
| `session-hooks.ts` | SessionStart inject / Stop reflect stubs |

## TODOs

- Wire real Cursor session hooks
- Real MCP stdio server (`src/mcp/server.ts` has handlers only)
- Continual-learning-bench custom harness adapter
