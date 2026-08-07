# agent-knowledge-cards

Minimal knowledge-cards library for coding agents: durable facts as cards, reinjected as trusted memory.

Inspired by [continual-learning-bench#11](https://github.com/pgasawa/continual-learning-bench/pull/11) (end-of-episode reflected cards). This repo is a standalone, harness-agnostic core with thin adapters.

**Status:** v0 — make it exist first. Simple functions + JSON storage. No vectors, graphs, or LLM reflection yet.

## Install

```bash
bun install
```

## Quick start

```bash
# Propose a card
bun run kc propose "Use when: auth\nJWTs go in the Authorization header"

# Query
bun run kc query jwt
bun run kc status

# Stub reflect from an episode file
bun run kc reflect --episode /tmp/episode.txt
```

Default notebook path: `.knowledge-cards/notebook.json` (override with `--path`).

## Architecture

```
Episode → ingest / reflect → store (JSON) → retrieve → adapters → host
```

| Component | Module | Role |
|-----------|--------|------|
| Ingestion | `src/core/ingestion.ts` | `proposeCard` |
| Storage | `src/core/storage.ts` | `loadNotebook` / `saveNotebook` |
| Retrieval | `src/core/retrieval.ts` | `queryCards` / `getCard` |
| Reflection | `src/core/reflection.ts` | stub `reflect` (no LLM) |
| CLI | `src/cli/` | `kc` commands |
| MCP | `src/mcp/server.ts` | tool handlers (stdio TODO) |
| Adapters | `src/adapters/` | inject + session-hook stubs |
| Eval | `eval/` | with/without cards A/B (**TODO**) |

## Library usage

```ts
import {
  emptyNotebook,
  proposeCard,
  saveNotebook,
  loadNotebook,
  queryCards,
  formatCardsForInject,
} from "agent-knowledge-cards";

let nb = emptyNotebook();
nb = proposeCard(nb, "Amounts are integer cents");
await saveNotebook(nb);
const cards = queryCards(await loadNotebook(), "cents");
console.log(formatCardsForInject(cards));
```

## Roadmap / TODOs

1. Real LLM reflection (full notebook rebuild like CL bench)
2. Eval harness: coding agent with vs without pre-seeded cards (`eval/`)
3. Cursor session hooks adapter (SessionStart inject / Stop reflect)
4. Real MCP stdio server
5. SQLite + FTS / progressive disclosure
6. Task-tuned reflection prompts
7. Drift / STALE card handling
8. Custom harness adapter for continual-learning-bench
9. Budgeted retrieval (count/char caps)
10. Confirm/flag feedback on cards

## Commands

```bash
bun test
bun run typecheck
bun run kc -- help   # shows usage via missing command
```

## Related

- Design ancestor: [knowledge_cards in CL bench](https://github.com/pgasawa/continual-learning-bench/pull/11)
- Pattern refs: [mozilla-ai/cq](https://github.com/mozilla-ai/cq), [claude-mem](https://github.com/thedotmack/claude-mem), [TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory), [graphify](https://github.com/Graphify-Labs/graphify)
