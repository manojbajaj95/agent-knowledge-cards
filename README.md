# Knowcards

### Local-first durable facts for coding agents, reinjected as trusted memory

> **Alpha** — this package is early. The API and host hook shapes may change.

[![npm version](https://img.shields.io/npm/v/knowcards?style=flat-square)](https://www.npmjs.com/package/knowcards)
[![npm](https://img.shields.io/npm/dm/knowcards?style=flat-square&logo=npm)](https://www.npmjs.com/package/knowcards)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square)](https://nodejs.org/)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-hooks-191919?style=flat-square)](https://code.claude.com/docs/en/hooks)
[![Codex](https://img.shields.io/badge/Codex-hooks-412991?style=flat-square)](https://developers.openai.com/codex/hooks)
[![Cursor](https://img.shields.io/badge/Cursor-hooks-000000?style=flat-square)](https://cursor.com/docs/hooks)
[![license](https://img.shields.io/github/license/manojbajaj95/agent-knowledge-cards?style=flat-square)](LICENSE)

[Highlights](#highlights) · [Quick start](#quick-start) · [Agent protocol](#agent-protocol) · [How it works](#how-it-works) · [Benchmarks](#benchmarks) · [Docs](#docs)

---

## Highlights

> **Knowcards = project-local markdown facts + automatic inject/reflect on supported hosts.**
>
> - **Filesystem-first** — cards are plain markdown under `.agents/knowledge_cards`. No DB, no vectors.
> - **Trusted memory** — hits are preferred over rediscovery or a conflicting README unless the card is stale.
> - **Host edges** — `install` wires Claude Code / Codex / Cursor hooks; CLI and MCP remain for manual use.

Coding agents forget between sessions. They re-grep the tree, re-read the README, and still miss the constraint that mattered last time. That wastes tokens and wall clock — and fails when the workspace is wrong.

Knowcards keeps those facts as local cards and reinjects them. The agent prefers the card unless new evidence shows it is wrong.

---

## Quick start

```bash
# Install automatic inject + reflect hooks (pick your host)
npx knowcards install cursor
npx knowcards install claude-code
npx knowcards install codex

# Write a durable fact (creates dirs if needed)
npx knowcards propose --title "JWT auth header" \
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
---

Amounts are stored as integer cents; never use floating point for money.
```

Optional: put a custom reflection prompt in project-root `REFLECT.md`. If missing, knowcards uses the packaged default.

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

Install the [knowcards skill](skills/knowcards/SKILL.md) (or equivalent host instructions) so the agent can still query/propose mid-session without hooks.

---

## Agent protocol

With hooks installed, inject and end-of-session reflect run automatically. The manual loop still works:

1. **Before acting** — `npx knowcards query "<keywords>"` (or the MCP tool). Skip only for routine edits in code you already hold.
2. **Apply hits** — Prefer card facts. Verify against the repo when a card may be old.
3. **Propose at end** — Write durable facts from the *outcome* (what proved true), not the path you took. One atomic fact per card.

Do not propose plans, unverified guesses, or near-duplicates. Query first; if a card already covers it, skip.

---

## How it works

```
first prompt → retrieve → inject
session stop → reflect follow-up → agent proposes cards
propose → store (markdown) → loadAll → retrieve → inject → host
```

| Step | What happens |
| ---- | ------------ |
| Install | `knowcards install` merges host hooks (Claude Code / Codex / Cursor) |
| Inject | On the user prompt, retrieve relevant cards and inject titles (query or MCP for full text) |
| Reflect | On Stop, the host continues in the **same session** so the agent can propose cards. Claude Code wakes after the turn (`asyncRewake`). Cursor and Codex continue synchronously (host limit). |
| Propose | Write one fact worth keeping as a card (CLI, MCP, or reflect turn) |
| Store | One markdown file per card under `.agents/knowledge_cards/<notebook>/` |
| Load | Full library loads into memory when the process starts |
| Retrieve | Rank cards for the current query (MiniSearch) |
| Prefer | Agent treats cards as earned memory over README/rediscovery |

Knowcards does not bundle an LLM — the primary agent always proposes cards.

### Product

Two boxes:

- **Memory** owns the units and the ops: init, ingest (store), storage, retrieve, maintain, reflect (extract / promote).
- **Adapters** are how a host uses memory: **hooks**, **plugin**, **MCP**. `knowcards install` wires hooks only.

Only **L1** (knowledge cards) is in code today.

```
                 ▲
                /L3\     weights
               /----\
              /  L2  \   compiled: procedural skill · wiki · graph
             /--------\
            /    L1    \ atomic units (knowledge cards)
           /------------\
          /      L0      \ chats (host sessions; we do not store these)
         ----------------
```

**Reflect** extracts from the layer below and writes the layer above:

1. **Reflect to build cards** (v0) — the live chat is the source. Stop continues the session with a reflect prompt. The agent **ingests** cards via `propose`.
2. **Reflect to build a procedural skill** (later) — cards that describe a repeat procedure compile into an L2 skill.

**Ingest** is how you store a unit at the current layer (`propose` today). **Init** is a first fill for a new repo (for example, onboard and build a first wiki). Init is not wired; `propose` still creates card dirs. The CLI `init` command is hidden.

### Code layout

- `src/core/` and `src/lifecycle/` — memory (cards, retrieve, ingest, reflect prompt)
- `src/adapters/` — host hook envelopes (Claude Code / Cursor / Codex)
- `src/mcp/` and `src/cli/` — memory API; `install` is adapter wiring

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
| [`ROADMAP.md`](ROADMAP.md)       | Testable knobs and A/B hypotheses             |
| [`AGENTS.md`](AGENTS.md)         | Conventions for agents working in this repo   |
| [`eval/README.md`](eval/README.md) | Harbor with/without cards A/B               |
| [`skills/knowcards/SKILL.md`](skills/knowcards/SKILL.md) | Agent skill: when to query / propose |

## License

MIT. See [LICENSE](LICENSE).

Author: [mbajaj_](https://twitter.com/mbajaj_)
