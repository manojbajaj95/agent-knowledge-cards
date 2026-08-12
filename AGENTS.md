# AGENTS.md

Always talk in ASD-STE100 Simplified Technical English. Also follow Zinsser's four principles of quality writing:
1. Simplicity
2. Brevity
3. Clarity
4. Humanity

Conventions for agents working in this repo.

## Layout

- `src/core/` — pure-ish functions (ingest, retrieve, inject wording, reflect prompts) + abstract storage. Host-agnostic.
- `src/cli/` — thin CLI over core (`install`, `status`, `query`, `propose`, `mcp`).
- `src/adapters/` — runnable host hook entrypoints (Claude Code / Cursor / Codex). Not CLI subcommands.
- `src/mcp/` — MCP stdio server (`@modelcontextprotocol/sdk`); tool logic in `tools.ts`.
- `src/lifecycle/` — session prompt inject + Stop reflect follow-up text. Keep thin.
- `eval/` — Harbor with/without cards A/B (`eval:prepare` / `eval:run` / `eval:compare`). **Primary validation** for this slice (manual; not CI).
- `tests/eval.test.ts` — offline checks for the eval pipeline (prepare / metrics / compare). No separate unit-test suite.
- `dist/` — build output for npm / `npx` (do not edit; emit with `bun run build`).

## On-disk cards

**Filesystem-first:** cards are local markdown only (`.agents/knowledge_cards/<notebook-id>/*.md`). No DB backend yet. `propose` creates notebook dirs as needed (`init` is parked). Process start loads the full library into memory via `openLibrary`.

## Commands

```bash
bun install
pre-commit install       # once per clone
bun test                 # eval pipeline offline checks only
bun run typecheck
bun run lint
bun run build
bun run knowcards install cursor|claude-code|codex
bun run knowcards status|query|propose|mcp
bun run eval:prepare     # Harbor — manual
bun run eval:run -- --task repo-map --agent oracle
bun run eval:run -- --task repo-map  # terminus-2 + openai/gpt-5.6-luna
```

Use **bun** for local scripts (`bun test`, `bun run …`). The published package targets **Node** (`npx knowcards`); retrieval uses MiniSearch (no `bun:sqlite`).

## Rules

1. Keep core free of MCP SDK and Cursor APIs. Storage I/O lives behind `CardStorage`.
2. Lifecycle and MCP wrap core; do not put host APIs into core (inject *wording* in `src/core/inject.ts` is fine; Cursor/MCP SDKs are not).
3. Do not add vectors, graphs, or hybrid search to core without discussion. See [ROADMAP.md](ROADMAP.md).
4. Prefer the smallest change that makes the feature exist; polish later.
5. Conventional Commits for git messages (`feat:`, `fix:`, `chore:`, …) — Release Please drives versions from these.
6. **Rely on Harbor evals** to judge product changes in this slice (with/without cards A/B). Do not grow a parallel unit-test suite unless needed for eval tooling. Do not add Harbor to CI.

## Design ancestor

CL bench `knowledge_cards`: act during an instance, reflect at end, inject cards as trusted memory. This library generalizes that into reusable functions + lifecycle/MCP host edges.
