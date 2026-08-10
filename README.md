# agent-knowledge-cards

A small library of knowledge cards for coding agents. Cards hold durable facts and get reinjected as trusted memory.

The design comes from the knowledge_cards system in [continual-learning-bench#11](https://github.com/pgasawa/continual-learning-bench/pull/11). This repo turns that into a separate core you can wire through CLI, MCP, or session hooks.

On [Continual Learning Bench](https://github.com/pgasawa/continual-learning-bench), knowledge cards beat ICL, ACE, and Mem0 in early matched runs on the tasks covered in that PR. Cards are reflected at the end of an instance and reinjected as trusted memory. Setup, configs, and numbers are in the PR.

**Harbor A/B (`repo-map`, terminus-2 + GPT-5.6 Luna, n=3):** both arms reward 1.0. Mean with-cards vs without-cards:

| Metric | with-cards | without-cards | savings |
|--------|------------|---------------|---------|
| Cost (USD) | $0.001472 | $0.002448 | **39.9%** |
| Duration (s) | 8.773 | 14.632 | **40.0%** |
| Input tokens | 2848 | 6395 | 55.5% |
| Output tokens | 674 | 1242 | 45.8% |

This library is in active development (v0). APIs, on-disk format, and CLI can break without notice until there is a stable release.

v0 is **filesystem-first**: knowledge cards live only as local markdown files under `.agents/knowledge_cards/<notebook>/`. There is no database backend yet. No vectors, graphs, or LLM reflection yet.

## Install

```bash
npm install agent-knowledge-cards
npx kc --help

# from source (Bun for local scripts)
bun install
bun run build
```

## Quick start

```bash
# Create root + default notebook
npx kc init
# or from a clone: bun run kc init

# Propose a card (title required; filename slugified from title)
npx kc propose --title "JWT auth header" --use-when auth \
  "JWTs go in the Authorization header"

# Query / status (loads all notebooks into memory)
npx kc query jwt
npx kc status
```

Default root: `.agents/knowledge_cards` (override with `--root`). Default notebook: `default`.

## On-disk layout (filesystem storage)

Persistence is the local filesystem only. Each notebook is a directory; each card is one `.md` file.

```
.agents/knowledge_cards/
  default/                    # notebook (domain); more domains later
    jwt-auth-header.md        # one card per file; filename = slug
```

Each card is markdown with frontmatter (`id`, `createdAt`, `updatedAt`, `title`, optional `useWhen`) and a body for details. The filename slug is derived from `title`.

## Architecture

```
init → store (markdown) → loadAll (in-memory library) → retrieve → inject → host
         ↑
      propose (ingest)
```

| Component | Module | Role |
|-----------|--------|------|
| Ingestion | `src/core/ingestion.ts` | `proposeCard` (requires title; slugifies for filename) |
| Storage | `src/core/storage.ts` | `CardStorage` + filesystem `FsCardStorage` (only backend today) |
| Retrieval | `src/core/retrieval.ts` | MiniSearch (BM25+) over cards loaded from disk |
| Inject | `src/core/inject.ts` | trusted-memory prompt block (`formatCardsForInject`) |
| Lifecycle | `src/lifecycle/` | session hooks + message-list inject |
| Reflection | `src/core/reflection.ts` | TODO |
| CLI | `src/cli/` | `kc init\|status\|query\|propose` |
| MCP | `src/mcp/` | stdio server via `@modelcontextprotocol/sdk` (`bun run mcp`) |
| Eval | `eval/` | Harbor with/without cards A/B (cost / time) |

## Library usage

```ts
import {
  FsCardStorage,
  openLibrary,
  proposeCard,
  queryLibrary,
  formatCardsForInject,
} from "agent-knowledge-cards";

const root = ".agents/knowledge_cards";
const storage = new FsCardStorage(root);
await storage.init();

const { library } = await openLibrary(root);
const nb = library.notebooks[0]!;
const { card } = proposeCard(nb, {
  title: "Amounts are integer cents",
  body: "Never use floating point for money.",
});
await storage.writeCard(nb.id, card);

const { library: loaded } = await openLibrary(root);
console.log(formatCardsForInject(queryLibrary(loaded, "cents")));
```

## Roadmap

Research map (hierarchy L0–L4, eval suite, hypotheses): [`roadmap.md`](roadmap.md).

## Eval (Harbor A/B)

Same coding task, with vs without a knowledge card. Same reward — lower cost and latency when the card maps the repo. Latest `repo-map` means (n=3): **39.9%** cost and **40.0%** duration savings (table above).

```bash
bun run eval:run -- --task repo-map -k 3
```

Details: [`eval/README.md`](eval/README.md).

## Commands

```bash
bun test              # eval pipeline offline checks only
bun run typecheck
bun run lint
bun run build         # emit dist/ (npm / npx)
bun run kc init
bun run mcp           # MCP stdio server (init/status/query/propose)
bun run eval:run -- --task repo-map   # Harbor A/B — manual, not CI
```

Product judgment for this slice is **Harbor with/without-cards evals**, not a unit-test suite. See [`eval/README.md`](eval/README.md). Releases: Conventional Commits → Release Please → OIDC npm publish. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

### MCP (Cursor)

After install (`kc-mcp` on PATH), or from a clone:

```json
{
  "mcpServers": {
    "knowledge-cards": {
      "command": "kc-mcp"
    }
  }
}
```

From source without build: `"command": "bun", "args": ["run", "/absolute/path/to/agent-knowledge-cards/src/mcp/stdio.ts"]`.

## Related

- Origin and results: [knowledge_cards PR on continual-learning-bench](https://github.com/pgasawa/continual-learning-bench/pull/11) (mechanism and early wins vs ICL / ACE / Mem0)
- Pattern refs: [mozilla-ai/cq](https://github.com/mozilla-ai/cq), [claude-mem](https://github.com/thedotmack/claude-mem), [TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory), [graphify](https://github.com/Graphify-Labs/graphify)
