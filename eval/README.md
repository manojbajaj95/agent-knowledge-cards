# Eval: with vs without knowcards

Harbor A/B comparing **reward**, **cost_usd** (uncached input + cache), and **agent_execution** duration (not env/setup/verifier).

Built on [Harbor](https://www.harborframework.com/). Tasks are official [SWE-bench Verified](https://www.swebench.com/) packages (`swe-bench/swe-bench-verified`) with the standard instruction, Docker image, gold `solution/solve.sh`, and verifier. We add one seed card per task and bake Node + Pi into the image.

Default agent/model: pinned `pi@0.84.2` + `openai/gpt-5.6-luna`.

## Eval kinds

| Kind | Question | Status |
|------|----------|--------|
| **A/B** | Does knowcards (skill + CLI) change reward, cost, or duration on a **fixed** task? | Shipped (this README) |
| **Sequential** | Does memory from earlier work on **one repo** help later tasks? (same env; 3–4 instructions in order; cards persist; TF-4) | Named only — no runner yet |

These four instances are independent A/B families. They are not a sequential suite.

## A/B method

One Harbor task package per instance. Instruction, env, and tests are the official SWE-bench ones for both arms. Seed cards are prepared outside `environment/` and bind-mounted only on the with-arm at `/testbed/.agents/knowledge_cards`. Arms differ in agent setup:

| Arm | Agent |
|-----|--------|
| without-knowcards | `harbor_pi:PiBare` at pinned version — no extension, no knowcards CLI, no seed cards in the image |
| with-knowcards | `harbor_pi:PiWithKnowcards` + `knowcards install pi --global` + packed `knowcards` CLI on PATH + seed cards mounted at `/testbed/.agents/knowledge_cards` |

Stock Harbor `pi` on 0.20.0 installs `@mariozechner/pi-coding-agent` (stops at 0.73.x). Our wrappers use `@earendil-works/pi-coding-agent@0.84.2` **baked into** each task Dockerfile on top of the SWE-bench base image. `harbor_pi.py` only verifies `pi` and installs `knowcards.tgz` on the with-arm. Keep Dockerfile `PI_VERSION` in sync with `EVAL_PI_VERSION` in `eval/prepare.ts`.

No plugin beyond the Pi extension. No MCP. No `AGENTS.md` hint. Prepare writes **exactly one** seed card per task to `seed_cards/` next to `environment/` (not inside the Docker build context). The with-arm mounts that dir; the without-arm cannot grep card files. Prepare also strips any `environment/.agents` or `AGENTS.md` and deletes stale `*-with-cards` / `*-without-cards` forks.

Harbor runs `pi --print --mode json`. The extension injects card titles after the user query, then queues a reflect follow-up after the final answer (`agent_end`).

SWE-bench images are `linux/amd64`. Docker on Apple Silicon runs them with emulation.

## Tasks

Four SWE-bench Verified instances (human time 15 min–1 hour). The card names the live file(s). The verifier is the official SWE-bench test script (hidden FAIL_TO_PASS / PASS_TO_PASS). Oracle applies the gold patch.

| Task id | Repo | Goal of the card |
|---------|------|------------------|
| `pytest-dev__pytest-10051` | pytest | `caplog.clear` must keep `get_records` on the same list (`src/_pytest/logging.py`) |
| `psf__requests-2931` | requests | Binary PUT bodies must not go through `to_native_string` (`requests/models.py`) |
| `pylint-dev__pylint-4604` | pylint | Type comments count as uses for `unused-import` (`pylint/checkers/variables.py`) |
| `sphinx-doc__sphinx-10466` | sphinx | gettext `Message.locations` must not duplicate (`sphinx/builders/gettext.py`) |

Omit `--task` to run all four. Pass `--task <id>` for one.

## Setup

```bash
uv tool install harbor   # https://www.harborframework.com/
bun install
bun run eval:prepare                              # all templates + knowcards.tgz
bun run eval:prepare -- pytest-dev__pytest-10051  # one task
```

Oracle (no LLM API) sanity-check — **one** run, not A/B:

```bash
bun run eval:run -- --task pytest-dev__pytest-10051 --agent oracle
```

Real agent A/B (needs `OPENAI_API_KEY`):

```bash
bun run eval:run -- --task pytest-dev__pytest-10051
# all four:
bun run eval:run
```

Jobs land in `eval/jobs/`. Compare two existing job dirs.

`cost_usd` comes from Pi (uncached input + cache read/write + output). The table splits Harbor’s lumped `n_input_tokens` into uncached `input_tok` and `cache_tok`. `duration_s` is `agent_execution` only — not image build, `agent_setup` (knowcards install), or the verifier.

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
  templates/<task-id>/   # official SWE-bench task + cards/ + instruction.base.md
  prepare.ts             # writes harbor/<task-id> + Pi bake + knowcards.tgz
  harbor_pi.py           # Pi + knowcards install (with-arm only)
  run.ts                 # prepare → harbor run ×2 → compare
  compare.ts / metrics.ts
  fixtures/              # sample-library + offline compare fixtures
  harbor/                # generated dataset (gitignored; run eval:prepare)
  jobs/                  # local Harbor outputs (gitignored)
```

Seed cards use the same layout as production. Prepare copies them to `harbor/<task-id>/seed_cards/` (outside the Docker context); the with-arm mounts that path at `/testbed/.agents/knowledge_cards`.

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
