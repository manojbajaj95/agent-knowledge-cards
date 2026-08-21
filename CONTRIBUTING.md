# Contributing

## Links

- **Contributing guide**: this file
- **Create an issue**: [github.com/manojbajaj95/agent-knowledge-cards/issues](https://github.com/manojbajaj95/agent-knowledge-cards/issues)

## Setup

```bash
bun install
pre-commit install        # Biome + basic file checks on commit
bun test                  # eval pipeline offline checks
bun run typecheck
bun run lint
bun run build             # emit dist/ for publish / npx
```

## Harbor evals

Harbor A/B evals are the primary validation for this slice. They are **manual only** (not in CI).

```bash
bun run eval:prepare
bun run eval:run -- --task pytest-dev__pytest-10051 --agent oracle   # sanity, no LLM
bun run eval:run -- --task pytest-dev__pytest-10051                  # pi@0.84.2 + openai/gpt-5.6-luna
bun run eval:run                                                     # all four SWE-bench Verified tasks
```

Same SWE-bench Verified issue, with vs without knowcards (Pi extension + CLI on pinned Pi). Instruction, tests, and gold oracle come from Harbor `swe-bench/swe-bench-verified`. The seed card names the live file.

A second eval kind (**sequential**: same repo, 3–4 tasks, cards persist) is named in [`eval/README.md`](eval/README.md) but not wired yet.

Details: [`eval/README.md`](eval/README.md).

`bun test` covers eval prepare/metrics/compare helpers plus retrieve/fetch. Not a general unit suite.

## Research contributions

Contributors are welcome. You can help in these ways:

- **Hypotheses**: Open an issue that names one knob, the A/B arms, and a cite when you have one.
- **Plugins / harness**: Wire hosts in `src/adapters/` (hook envelopes or the Pi extension) or `src/mcp/`. Keep `src/memory` free of host SDKs (Cursor, MCP, Pi). Adapters must not import `src/memory`. Fetch wording lives in `src/harness/fetch.ts`. Install with `knowcards install <host>` only — do not add a `hook` CLI. Keep fetch hooks synchronous. Claude Code Stop may use `asyncRewake`; do not set `async` on Cursor or Codex Stop. Pi reflects on `agent_end` (follow-up after the final answer).
- **Task families**: Add Harbor tasks under `eval/templates/` so the eval suite can test more memory questions.

Eval uses Harbor. Pin harness versions. Log which knob you changed. Product shape is in [`README.md`](README.md#how-it-works).

## Pull requests

Work on a feature branch, not `main`. Keep PRs small. Prefer a working slice over speculative architecture.

`main` requires a PR and a green `ci` check. Maintainers can bypass branch protection when needed.

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`. Release Please uses these for SemVer and `CHANGELOG.md`.

Keep `src/memory` free of host SDKs. Put session fetch/reflect in `src/harness/`; put host hook envelopes in `src/adapters/` (do not import `src/memory` from adapters); put MCP in `src/mcp/`. Persist workflows live in `src/memory/ops.ts` (CLI and MCP call them).

## Tooling

| Tool | Command |
|------|---------|
| Lint / format | `bun run lint` / `bun run lint:fix` (Biome) |
| Typecheck | `bun run typecheck` |
| Build | `bun run build` → `dist/` |
| Tests | `bun test` |
| MCP (dev) | `bun run knowcards mcp` / `npx knowcards mcp` |
| Pre-commit | Biome check + trailing whitespace / YAML / large files |
| CI | `.github/workflows/ci.yml` (lint, typecheck, build, test) |
| Release | Release Please opens a PR (enhanced `CHANGELOG.md`) → merge tags → OIDC `npm publish` (`.github/workflows/release-please.yml`) |

Harbor evals are not run in CI.

## Principles

- YAGNI: build for today's requirement.
- Prefer trusted libraries over hand-rolled crypto, HTTP clients, or parsers.
- Deep modules: small surface, real internals. More files is not more modular.
- Clear boundaries: memory saves, stores, and retrieves; harness owns fetch and reflect; adapters wrap host envelopes; MCP and CLI present.
- No caching, batching, or concurrency without a measured problem.
- Skip features and abstractions that do not solve a problem we have now.
- Leave the nearby code a little better (typo, dead import, unclear comment).
- Comment the why, not the what.
- Update docs in the same change when behavior changes.
