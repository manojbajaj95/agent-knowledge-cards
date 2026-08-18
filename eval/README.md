# Eval: with vs without knowcards

Harbor A/B comparing **reward**, **cost_usd**, and **agent duration**.

Built on [Harbor](https://www.harborframework.com/).

Default agent/model: pinned `pi@0.84.2` + `openai/gpt-5.6-luna`.

## Eval kinds

| Kind | Question | Status |
|------|----------|--------|
| **A/B** | Does knowcards (skill + CLI) change reward, cost, or duration on a **fixed** task? | Shipped (this README) |
| **Sequential** | Does memory from earlier work on **one repo** help later tasks? (same env; 3–4 instructions in order; cards persist; TF-4) | Named only — no runner yet |

`repo-map` and `payments-cents` are A/B families (different repos). They are not a sequential suite.

## A/B method

One Harbor task package per family. Instruction, env, and tests are the same for both arms. Seed cards are prepared outside `environment/` and bind-mounted only on the with-arm. Arms differ in agent setup:

| Arm | Agent |
|-----|--------|
| without-knowcards | `harbor_pi:PiBare` at pinned version — no skills, no knowcards CLI, no seed cards in the image |
| with-knowcards | `harbor_pi:PiWithKnowcards` + Harbor `--skill skills/knowcards` + packed `knowcards` CLI on PATH + seed cards mounted at `/app/.agents/knowledge_cards` |

Stock Harbor `pi` on 0.20.0 installs `@mariozechner/pi-coding-agent` (stops at 0.73.x). Our wrappers use `@earendil-works/pi-coding-agent@0.84.2` **baked into** each task `environment/Dockerfile` (Node 22 + Pi). `harbor_pi.py` only verifies `pi` and installs `knowcards.tgz` on the with-arm — no cold nvm install per trial. Keep Dockerfile `PI_VERSION` in sync with `DEFAULT_PI_VERSION` in `eval/run.ts`.

No plugin. No MCP. No `AGENTS.md` hint. Prepare writes **exactly one** seed card per task to `seed_cards/` next to `environment/` (not inside the Docker build context). The with-arm mounts that dir; the without-arm cannot grep card files. Prepare also strips any `environment/.agents` or `AGENTS.md` and deletes stale `*-with-cards` / `*-without-cards` forks.

## Tasks

| Task id | Goal of the card | Expected without-knowcards |
|---------|------------------|----------------------------|
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
bun run eval:prepare                 # all templates + knowcards.tgz
bun run eval:prepare -- repo-map     # one task
```

Oracle (no LLM API) sanity-check — **one** run, not A/B:

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
  templates/<task-id>/   # instruction.base.md, cards/, env, tests, solution
  prepare.ts             # writes harbor/<task-id> + knowcards.tgz
  harbor_pi.py           # Pi + knowcards install (with-arm only)
  run.ts                 # prepare → harbor run ×2 → compare
  compare.ts / metrics.ts
  fixtures/              # sample-library + offline compare fixtures
  harbor/                # generated dataset (gitignored; run eval:prepare)
  jobs/                  # local Harbor outputs (gitignored)
```

Seed cards use the same layout as production. Prepare copies them to `harbor/<task-id>/seed_cards/` (outside the Docker context); the with-arm mounts that path at `/app/.agents/knowledge_cards`.

```
templates/<task-id>/cards/default/*.md
→ harbor/<task-id>/seed_cards/default/*.md  (host only; with-arm mount)
```

## Offline check

Eval pipeline helpers only (prepare / metrics / compare). Product A/B runs use `eval:run`.

```bash
bun test
bun run eval:compare -- \
  --with eval/fixtures/sample-results/with-cards \
  --without eval/fixtures/sample-results/without-cards
```
