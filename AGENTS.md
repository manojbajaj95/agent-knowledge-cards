# AGENTS.md

Conventions for agents working in this repo.

## Layout

- `src/core/` — pure functions (ingest, store, retrieve, reflect). Host-agnostic.
- `src/cli/` — thin CLI over core.
- `src/mcp/` — MCP tool handlers (stdio server not wired yet).
- `src/adapters/` — harness edges (hooks, inject helpers). Keep thin.
- `eval/` — with/without cards A/B (**TODO**, fixtures only).
- `tests/` — `bun:test`.

## Commands

```bash
bun install
bun test
bun run typecheck
bun run kc status|query|propose|reflect
```

Use **bun**, not npm/pnpm/yarn/node for scripts.

## Rules

1. Keep core pure: no MCP SDK, no Cursor APIs, no network in `src/core/`.
2. Adapters wrap core; do not put host logic into core.
3. Do not add vectors, graphs, or hybrid search to core without discussion — see README roadmap.
4. Prefer the smallest change that makes the feature exist; polish later.
5. Conventional Commits for git messages (`feat:`, `fix:`, `chore:`, …).

## Design ancestor

CL bench `knowledge_cards`: act during an instance, reflect at end, inject cards as trusted memory. This library generalizes that into reusable functions + adapters.
