# Contributing

## Links

- **Contributing guide**: this file
- **Roadmap**: [ROADMAP.md](ROADMAP.md)
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
bun run eval:run -- --task repo-map --agent oracle   # sanity, no LLM
bun run eval:run -- --task repo-map                  # pi@0.84.2 + openai/gpt-5.6-luna
bun run eval:run -- --task payments-cents            # correctness under misleading README
```

Same coding task, with vs without knowcards (skill + CLI on pinned Pi). `repo-map` measures cost/time/token savings when both arms solve it. `payments-cents` measures correctness when the README is wrong.

A second eval kind (**sequential**: same repo, 3–4 tasks, cards persist) is named in [`eval/README.md`](eval/README.md) but not wired yet.

Details: [`eval/README.md`](eval/README.md). Research map: [`ROADMAP.md`](ROADMAP.md).

`bun test` covers eval prepare/metrics/compare helpers plus retrieve/inject. Not a general unit suite.

## Research contributions

Contributors are welcome. You can help in these ways:

- **Hypotheses**: Add a new entry to [`ROADMAP.md`](ROADMAP.md) (or open an issue that links a draft entry). Name one knob from that file, the A/B arms, and a cite when you have one.
- **Plugins / lifecycle**: Wire hosts in `src/adapters/` (hook envelopes) or `src/mcp/`. Keep `src/core` free of host SDKs (Cursor, MCP). Adapters must not import `src/core`. Inject prompt wording may live in `src/core/inject.ts`. Install with `knowcards install <host>` only — do not add a `hook` CLI. Keep inject hooks synchronous. Claude Code Stop may use `asyncRewake`; do not set `async` on Cursor or Codex Stop.
- **Task families**: Add Harbor tasks under `eval/templates/` so the eval suite can test more memory questions.

Read [`ROADMAP.md`](ROADMAP.md) before large research work. Eval uses Harbor. Pin harness versions. Log which knob you changed. Product shape is in [`README.md`](README.md#product).

## Pull requests

Work on a feature branch, not `main`. Keep PRs small. Prefer a working slice over speculative architecture.

`main` requires a PR and a green `ci` check. Maintainers can bypass branch protection when needed.

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`. Release Please uses these for SemVer and `CHANGELOG.md`.

Keep `src/core` free of host SDKs. Put session retrieve/reflect strings in `src/lifecycle/`; put host hook envelopes in `src/adapters/` (do not import `src/core` from adapters); put MCP in `src/mcp/`.

If you pull a hypothesis forward from [`ROADMAP.md`](ROADMAP.md), leave a clear TODO and keep the v0 path working.

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
| Release | Release Please → git tag → OIDC `npm publish` (`.github/workflows/release-please.yml`) |

Harbor evals are not run in CI.

## Principles

- YAGNI: build for today's requirement.
- Prefer trusted libraries over hand-rolled crypto, HTTP clients, or parsers.
- Deep modules: small surface, real internals. More files is not more modular.
- Clear boundaries: core stores, retrieves, and formats inject text; lifecycle is the session memory API; adapters wrap host envelopes; MCP and CLI present.
- No caching, batching, or concurrency without a measured problem.
- Skip features and abstractions that do not solve a problem we have now.
- Leave the nearby code a little better (typo, dead import, unclear comment).
- Comment the why, not the what.
- Update docs in the same change when behavior changes.
