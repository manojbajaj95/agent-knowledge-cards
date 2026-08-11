# Knowcards

### Local-first durable facts for coding agents, reinjected as trusted memory

[![npm version](https://img.shields.io/npm/v/knowcards?style=flat-square)](https://www.npmjs.com/package/knowcards)
[![npm](https://img.shields.io/npm/dm/knowcards?style=flat-square&logo=npm)](https://www.npmjs.com/package/knowcards)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square)](https://nodejs.org/)
[![license](https://img.shields.io/github/license/manojbajaj95/agent-knowledge-cards?style=flat-square)](LICENSE)

[Highlights](#highlights) · [Quick start](#quick-start) · [Agent protocol](#agent-protocol) · [How it works](#how-it-works) · [Benchmarks](#benchmarks) · [Docs](#docs)

---

## Highlights

> **Knowcards = project-local markdown facts + a query/propose loop agents actually follow.**
>
> - **Filesystem-first** — cards are plain markdown under `.agents/knowledge_cards`. No DB, no vectors.
> - **Trusted memory** — hits are preferred over rediscovery or a conflicting README unless the card is stale.
> - **Host edges** — CLI for humans, MCP for agents; same core either way.

Coding agents forget between sessions. They re-grep the tree, re-read the README, and still miss the constraint that mattered last time. That wastes tokens and wall clock — and fails when the workspace is wrong.

Knowcards keeps those facts as local cards and reinjects them. The agent prefers the card unless new evidence shows it is wrong.

---

## Quick start

```bash
# Write a durable fact (creates dirs if needed)
npx knowcards propose --title "JWT auth header" --use-when auth \
  "JWTs go in the Authorization header"

# Search the local card library
npx knowcards query jwt

# Show notebook paths and card counts
npx knowcards status

# MCP stdio server (for host config below)
npx knowcards mcp
```

Cards live at `.agents/knowledge_cards/<notebook-id>/*.md`:

```markdown
---
title: Payment amounts are integer cents
useWhen: touching the payments module
---

Amounts are stored as integer cents; never use floating point for money.
```

### MCP

```json
{
  "mcpServers": {
    "knowledge-cards": {
      "command": "npx",
      "args": ["knowcards", "mcp"]
    }
  }
}
```

Install the [knowcards skill](skills/knowcards/SKILL.md) (or equivalent host instructions) so the agent runs the query/propose loop without being asked.

---

## Agent protocol

Memory only helps if the agent uses it. The loop:

1. **Before acting** — `npx knowcards query "<keywords>"` (or the MCP tool). Skip only for routine edits in code you already hold.
2. **Apply hits** — Prefer card facts. Verify against the repo when a card may be old.
3. **Propose at end** — Write durable facts from the *outcome* (what proved true), not the path you took. One atomic fact per card.

Do not propose plans, unverified guesses, or near-duplicates. Query first; if a card already covers it, skip.

---

## How it works

```
propose → store (markdown) → loadAll → retrieve → inject → host
```

| Step     | What happens                                                           |
| -------- | ---------------------------------------------------------------------- |
| Propose  | Write one fact worth keeping as a card                                 |
| Store    | One markdown file per card under `.agents/knowledge_cards/<notebook>/` |
| Load     | Full library loads into memory when the process starts                 |
| Retrieve | Rank cards for the current query (MiniSearch)                          |
| Inject   | Host prepends a trusted-memory block to the prompt                     |
| Prefer   | Agent treats cards as earned memory over README/rediscovery            |

Core stays host-agnostic (`src/core/`). CLI and MCP are thin edges. Reflect is not available yet — propose mid-session instead.

---

## Benchmarks

On Continual Learning Bench, knowledge cards beat ICL, ACE, and Mem0 in early matched runs ([PR](https://github.com/pgasawa/continual-learning-bench/pull/11)).

Harbor A/B on `repo-map` (n=3): both arms hit reward 1.0. With cards, cost and duration fell about 40%, input tokens about 55%:

| Metric        | with-cards | without-cards | savings |
| ------------- | ---------- | ------------- | ------- |
| Cost (USD)    | $0.001472  | $0.002448     | 39.9%   |
| Duration (s)  | 8.773      | 14.632        | 40.0%   |
| Input tokens  | 2848       | 6395          | 55.5%   |
| Output tokens | 674        | 1242          | 45.8%   |

Harbor evals are the primary product judge for this slice (manual; not CI). See [`eval/README.md`](eval/README.md).

---

## Docs

| Document                         | Contents                                      |
| -------------------------------- | --------------------------------------------- |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Setup, Harbor evals, how to contribute     |
| [`ROADMAP.md`](ROADMAP.md)       | Research map and layer hypotheses             |
| [`AGENTS.md`](AGENTS.md)         | Conventions for agents working in this repo   |
| [`eval/README.md`](eval/README.md) | Harbor with/without cards A/B               |
| [`skills/knowcards/SKILL.md`](skills/knowcards/SKILL.md) | Agent skill: when to query / propose |

## License

MIT. See [LICENSE](LICENSE).
