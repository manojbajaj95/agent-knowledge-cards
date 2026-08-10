# Setup log

Date: 2026-08-10

## Assumptions

- Brownfield TypeScript library (CLI + MCP + Harbor eval tooling)
- Stack: Bun (local scripts/tests), `bun:test`, `tsc`, Biome; published runtime is Node
- Public npm package `agent-knowledge-cards`
- Retrieval: MiniSearch (BM25+); no `bun:sqlite`
- Harbor evals stay manual (not CI)

## Applied

| Area | What |
|------|------|
| Lint / format | Biome (`biome.json`), scripts `lint` / `lint:fix` / `format` |
| Pre-commit | `.pre-commit-config.yaml` — Biome (local/`bunx`) + trailing whitespace / EOF / YAML / large files / merge conflicts |
| Tests | Existing `bun test` (eval pipeline) wired in CI |
| Typecheck | Existing `bun run typecheck` wired in CI |
| Build / publish surface | `tsconfig.build.json` → `dist/` (JS + `.d.ts`); `private` removed; `exports` / `bin` / `files` / `publishConfig` / `engines.bun` |
| CI | `.github/workflows/ci.yml` — lint, typecheck, build, test on PR/`main` |
| Release | Release Please (`release-please-config.json`, `.release-please-manifest.json`) → tag → OIDC `npm publish` in `.github/workflows/release-please.yml` |
| Branch protection | `main`: require PR + `ci` status check; `enforce_admins: false` so maintainers can bypass |
| Actions token | Repo workflow permissions set to **write** so Release Please can open PRs |
| Docs | README, AGENTS.md, CONTRIBUTING.md updated |

## Skipped / deferred

| Item | Why |
|------|-----|
| ESLint / Prettier | Biome covers lint + format |
| Harbor in CI | Manual only (cost / flakiness); product judgment stays local |
| Branch protection via rulesets UI extras | Classic protection API is enough |
| Agent skills / Superpowers / Mattpocock / Addy Osmani | Not requested; ask if you want them |
| First npm package + trusted publisher on npmjs.com | Must be done once in the npm UI (see below) |
| Restricting npm token publish after OIDC works | Manual hardening step on npmjs.com |

## One-time npm trusted publisher

Trusted publishing is OIDC from GitHub Actions — no long-lived `NPM_TOKEN` in secrets.

1. Ensure the package name is available / owned under your npm account.
2. **Bootstrap:** if the package does not exist yet, publish once manually (`bun run build && npm publish --access public` with 2FA), **or** create the package entry on npmjs.com first if your account flow allows it.
3. On [npmjs.com](https://www.npmjs.com) → package **agent-knowledge-cards** → **Settings** → **Trusted Publisher**:
   - Provider: GitHub Actions
   - Organization or user: `manojbajaj95`
   - Repository: `agent-knowledge-cards`
   - Workflow filename: `release-please.yml` (filename only)
   - Allowed action: `npm publish`
4. After a successful OIDC publish, optionally set publishing access to require 2FA and disallow tokens.

## How releases work

1. Merge Conventional Commits to `main` (`feat:`, `fix:`, …).
2. Release Please opens/updates a release PR (version bump + `CHANGELOG.md`).
3. Merge the release PR → Release Please tags and creates a GitHub Release.
4. The `publish` job in `release-please.yml` builds, tests, and `npm publish` via OIDC.

## Verify locally

```bash
bun install
pre-commit install
bun run lint
bun run typecheck
bun run build
bun test
npm pack --dry-run
```
