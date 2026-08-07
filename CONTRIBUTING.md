# Contributing

## Setup

```bash
bun install
bun test
bun run typecheck
```

## Workflow

1. Work on a feature branch (not `main`).
2. Keep PRs small. Prefer “make it exist” over speculative architecture.
3. Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
4. Core stays pure; harness integration goes in `src/adapters/` or `src/mcp/`.

## Scope guidance

See the Roadmap / TODOs in [README.md](README.md). If you add a roadmap item early, leave a clear `TODO` and keep the v0 path working.

## Tooling (deferred)

- CI, pre-commit, and release automation are **not** set up yet (TODO).
- Lint/format: follow existing style; no enforced formatter in v0.

## Engineering principles

Prefer YAGNI, deep modules, and thin adapters. Do not introduce dependencies for problems we do not have yet.
