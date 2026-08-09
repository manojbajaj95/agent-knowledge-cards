# Contributing

## Setup

```bash
bun install
bun test                 # eval pipeline offline checks
bun run typecheck
bun run eval:prepare
```

Validation for this slice is **Harbor evals** (with/without cards A/B). `bun test` only covers eval prepare/metrics/compare helpers — not a general unit suite.
## Research contributions

Contributors are welcome. You can help in these ways:

- **Hypotheses** — Add a new entry to [`roadmap.md`](roadmap.md) (or open an issue that links a draft entry). Name the layer, the knob, the A/B arms, and a cite when you have one.
- **Plugins / lifecycle** — Wire hosts in `src/lifecycle/` or `src/mcp/`. Keep `src/core` free of host SDKs (Cursor, MCP). Inject prompt wording may live in `src/core/inject.ts`.
- **Task families** — Add Harbor tasks under `eval/templates/` so the eval suite can test more memory questions.

Read [`roadmap.md`](roadmap.md) before large research work. Eval uses Harbor + Pi. Pin harness versions. Log which knob you changed.

## Pull requests

Work on a feature branch, not `main`. Keep PRs small. Prefer a working slice over speculative architecture.

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.

Keep `src/core` free of host SDKs. Put session/message wiring in `src/lifecycle/` or `src/mcp/`.

If you pull a hypothesis forward from [`roadmap.md`](roadmap.md), leave a clear TODO and keep the v0 path working.

## Tooling

CI, pre-commit, and release automation are not set up yet. Match existing style; there is no enforced formatter in v0.

## Principles

- YAGNI: build for today's requirement.
- Prefer trusted libraries over hand-rolled crypto, HTTP clients, or parsers.
- Deep modules: small surface, real internals. More files is not more modular.
- Clear boundaries: core stores, retrieves, and formats inject text; lifecycle and MCP talk to hosts; CLI presents.
- No caching, batching, or concurrency without a measured problem.
- Skip features and abstractions that do not solve a problem we have now.
- Leave the nearby code a little better (typo, dead import, unclear comment).
- Comment the why, not the what.
- Update docs in the same change when behavior changes.
