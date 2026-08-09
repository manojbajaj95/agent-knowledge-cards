# AGENTS.md

Conventions for agents working in this repo.

## Layout

- `src/core/` — pure-ish functions (ingest, retrieve, inject wording, reflect stub) + abstract storage. Host-agnostic.
- `src/cli/` — thin CLI over core (`init`, `status`, `query`, `propose`).
- `src/mcp/` — MCP stdio server (`@modelcontextprotocol/sdk`); tool logic in `tools.ts`.
- `src/lifecycle/` — session hooks + message-list inject. Keep thin.
- `eval/` — Harbor with/without cards A/B (`eval:prepare` / `eval:run` / `eval:compare`). **Primary validation** for this slice.
- `tests/eval.test.ts` — offline checks for the eval pipeline (prepare / metrics / compare). No separate unit-test suite.

## On-disk cards

**Filesystem-first:** cards are local markdown only (`.agents/knowledge_cards/<notebook-id>/*.md`). No DB backend yet. `kc init` creates `default/`. Process start loads the full library into memory via `openLibrary`.

## Commands

```bash
bun install
bun test                 # eval pipeline offline checks only
bun run typecheck
bun run kc init|status|query|propose
bun run mcp              # MCP stdio server
bun run eval:prepare
bun run eval:run -- --task repo-map --agent oracle
bun run eval:run -- --task repo-map  # terminus-2 + openai/gpt-5.6-luna
```

Use **bun**, not npm/pnpm/yarn/node for scripts.

## Rules

1. Keep core free of MCP SDK and Cursor APIs. Storage I/O lives behind `CardStorage`.
2. Lifecycle and MCP wrap core; do not put host APIs into core (inject *wording* in `src/core/inject.ts` is fine; Cursor/MCP SDKs are not).
3. Do not add vectors, graphs, or hybrid search to core without discussion — see README roadmap.
4. Prefer the smallest change that makes the feature exist; polish later.
5. Conventional Commits for git messages (`feat:`, `fix:`, `chore:`, …).
6. **Rely on Harbor evals** to judge product changes in this slice (with/without cards A/B). Do not grow a parallel unit-test suite unless needed for eval tooling.
## Design ancestor

CL bench `knowledge_cards`: act during an instance, reflect at end, inject cards as trusted memory. This library generalizes that into reusable functions + lifecycle/MCP host edges.
