# agent-knowledge-cards

A small library of knowledge cards for coding agents. Cards hold durable facts and get reinjected as trusted memory.

The design comes from the knowledge_cards system in [continual-learning-bench#11](https://github.com/pgasawa/continual-learning-bench/pull/11). This repo turns that into a separate core you can wire through CLI, MCP, or session hooks.

On [Continual Learning Bench](https://github.com/pgasawa/continual-learning-bench), knowledge cards beat ICL, ACE, and Mem0 in early matched runs on the tasks covered in that PR. Cards are reflected at the end of an instance and reinjected as trusted memory. Setup, configs, and numbers are in the PR.

**Early Harbor signal:** on a same-task with/without-cards A/B (`repo-map`, terminus-2 + GPT-5.6 Luna), both arms passed — and the structure card cut **cost ~36%**, **time ~41%**, and **input tokens ~48%**.

This library is in active development (v0). APIs, on-disk format, and CLI can break without notice until there is a stable release.

v0 is intentionally thin: plain functions and JSON on disk. No vectors, graphs, or LLM reflection yet.

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
| Eval | `eval/` | Harbor with/without cards A/B (cost / time) |

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

## Roadmap

Research map (hierarchy L0–L4, eval suite, hypotheses): [`roadmap.md`](roadmap.md).

## Eval (Harbor A/B)

Same coding task, with vs without a knowledge card. Same reward — lower cost and latency when the card maps the repo.

```bash
bun run eval:run -- --task repo-map
```

Details: [`eval/README.md`](eval/README.md).

## Commands

```bash
bun test
bun run typecheck
bun run kc -- help   # shows usage via missing command
```

## Related

- Origin and results: [knowledge_cards PR on continual-learning-bench](https://github.com/pgasawa/continual-learning-bench/pull/11) (mechanism and early wins vs ICL / ACE / Mem0)
- Pattern refs: [mozilla-ai/cq](https://github.com/mozilla-ai/cq), [claude-mem](https://github.com/thedotmack/claude-mem), [TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory), [graphify](https://github.com/Graphify-Labs/graphify)
