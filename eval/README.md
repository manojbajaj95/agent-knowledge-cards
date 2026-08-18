# Eval: with vs without knowledge cards

Harbor A/B comparing **reward**, **cost_usd**, and **agent duration**.

Built on [Harbor](https://www.harborframework.com/).

Default agent/model: `terminus-2` + `openai/gpt-5.6-luna`.

## Current vs target A/B

**Today (v0):** prepare forks each template into two Harbor task dirs (`…-with-cards` / `…-without-cards`). Same env/tests/solution and **same** `instruction.md`. The with-cards arm copies seed cards into `environment/.agents/knowledge_cards/` plus a short `AGENTS.md` so the agent must read them. The without-cards arm has neither. This exercises on-disk retrieval, not instruction pre-inject and not MCP.

**Target:** one Harbor task package per family (instruction and env unchanged). A/B by **agent config**:

| Arm | Agent |
|-----|--------|
| with | Required system/prompt for knowledge cards + MCP (`npx knowcards mcp`) + tools to query/propose |
| without | Same base agent/model, no cards prompt, no MCP/tools |

Cards stay on disk in the sandbox (or host-mounted library); the with-arm agent must retrieve/inject via tools. Target A/B is tracked under ROADMAP knobs `mcp` / `retrieve`. HTTP MCP sidecar + same-task agent kwargs are the remaining gap (knowcards MCP is stdio; Harbor MCP examples use streamable-http).

## Tasks

| Task id | Goal of the card | Expected without-cards |
|---------|------------------|------------------------|
| `repo-map` (default) | Map live code path (`core/pipeline/steps/sku_normalize.py`); skip decoys | Still solvable, but more explore turns / tokens |
| `payments-cents` | Correct money convention (integer cents) | Often fails if it trusts the misleading “dollars” README |

### `repo-map`

Fix EU SKU prefix (`WIDGET` → `EU-WIDGET`). The bug is findable without the card, but the card names the live file and warns that `legacy/` + `decoys/` are dead ends — so the win is **fewer tokens / turns / time**, not pass/fail.

### `payments-cents`

Fix `apply_discount` for integer cents. Environment README says dollars; the card says cents. Measures **correctness** under a misleading local doc.

## Setup

```bash
uv tool install harbor   # https://www.harborframework.com/
bun install
bun run eval:prepare                 # all templates
bun run eval:prepare -- repo-map     # one task
```

Oracle (no LLM API) sanity-check:

```bash
bun run eval:run -- --task repo-map --agent oracle
```

Real agent A/B (needs `OPENAI_API_KEY`):

```bash
bun run eval:run -- --task repo-map
bun run eval:run -- --task payments-cents
# both:
bun run eval:run -- --task repo-map --task payments-cents
```

Jobs land in `eval/jobs/`. Compare two existing job dirs:

```bash
bun run eval:compare -- \
  --with eval/jobs/<with-job> \
  --without eval/jobs/<without-job> \
  --out /tmp/ab.json
```

Inspect trajectories:

```bash
harbor view eval/jobs
```

## Layout

```
eval/
  templates/<task-id>/   # instruction, cards/<notebook>/*.md, env, tests, solution
  prepare.ts             # writes harbor/<task>-{with,without}-cards
  run.ts                 # prepare → harbor run ×2 → compare
  compare.ts / metrics.ts
  fixtures/              # sample-library + offline compare fixtures
  harbor/                # generated dataset (gitignored; run eval:prepare)
  jobs/                  # local Harbor outputs (gitignored)
```

Seed cards use the same layout as production:

```
templates/<task-id>/cards/default/*.md
```

## Offline check

Eval pipeline helpers only (prepare / metrics / compare). Product A/B runs use `eval:run`.

```bash
bun test
bun run eval:compare -- \
  --with eval/fixtures/sample-results/with-cards \
  --without eval/fixtures/sample-results/without-cards
```
