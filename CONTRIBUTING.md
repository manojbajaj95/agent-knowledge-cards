# Contributing

## Setup

```bash
bun install
bun test
bun run typecheck
```

## Pull requests

Work on a feature branch, not `main`. Keep PRs small. Prefer a working slice over speculative architecture.

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.

Keep `src/core` free of host concerns. Put harness wiring in `src/adapters/` or `src/mcp/`.

If you pull something forward from the README roadmap, leave a clear TODO and keep the v0 path working.

## Tooling

CI, pre-commit, and release automation are not set up yet. Match existing style; there is no enforced formatter in v0.

## Principles

- YAGNI: build for today's requirement.
- Prefer trusted libraries over hand-rolled crypto, HTTP clients, or parsers.
- Deep modules: small surface, real internals. More files is not more modular.
- Clear boundaries: core stores and retrieves; adapters talk to hosts; CLI presents.
- No caching, batching, or concurrency without a measured problem.
- Skip features and abstractions that do not solve a problem we have now.
- Leave the nearby code a little better (typo, dead import, unclear comment).
- Comment the why, not the what.
- Update docs in the same change when behavior changes.
