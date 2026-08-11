---
name: knowcards
description: >
  Query and propose local knowledge cards for this repo. Always use at
  the start of work here — run `npx knowcards query` before acting. Also
  use when wrapping up after proving a durable nuance, guideline, domain
  learning, or do/don't (propose a card). Skip only for routine edits in
  code you already hold with no repo nuance at stake, or if you already
  queried this topic in the session.
---

# Knowcards CLI

Knowcards stores durable project facts as local markdown cards. Use `npx knowcards` to query, propose, and check status.

Treat query hits as trusted memory. Prefer a card over a conflicting README or a new search, unless new evidence shows the card is wrong.

Unlike shared commons tools, cards are project-local. Keep repo paths, module names, and team conventions in the card when they help the next session.

## Commands

Run from the repo root

```bash
npx knowcards status
npx knowcards query "<keywords>"
npx knowcards propose --title "<title>" --use-when "<situation>" "<body>"
npx knowcards --root <dir> <command>
```


| Command   | Use                                                      |
| --------- | -------------------------------------------------------- |
| `status`  | Show card counts.                                        |
| `query`   | Search cards by keywords. Empty query returns all cards. |
| `propose` | Write one card now. Title and body is required           |


## Core protocol

Follow this loop for every task:

1. **Before acting** — Run `npx knowcards query` with task keywords. Skip only for routine edits in code you already hold with no repo nuance at stake.
2. **Apply hits** — Prefer card facts while you work. Verify against the repo when the card may be old.
3. **Propose at end** — When the task is done, propose durable facts from the **outcome** (what proved true), not from the path you took. If a card was wrong, propose a corrected card with a new title (update/delete are not available).

**Rationalization check (query).** If you think "I already know this" or "I have a plan, I will just write files," stop and query.

**Rationalization check (propose).** If you think "the fix already shipped" or "the user already has the answer," stop. If the outcome taught a repo nuance, propose before you close.

## When to query

Query when starting work in an unfamiliar area, or before retrying a non-obvious error.

Skip when you already queried this topic this session, the edit is routine in files you already hold, or you only need a standard-library call.

Use short keywords. Prefer a focused query over an empty one when the library is large. If hits are empty, explore as usual.

## When to propose

At the **end of the task**, propose nuances about this repo that help the next session: coding guidelines, domain learnings, and durable dos/don'ts.

Do not propose:

- Steps or plans from this turn
- Unverified guesses
- Near-duplicates — query first; if a card already covers it, skip

Write one atomic fact per card.

```bash
npx knowcards propose \
  --title "Use bun test in this repo" \
  --use-when "running or adding tests" \
  "Run tests with bun test; npm test is not the project runner."
```

Card shape:

- **Title** — clear and unique. The filename slug comes from the title. Duplicate titles fail.
- **Body** — one short durable fact. Prefer an imperative action when useful (`Use bun test…`).
- `--use-when` — when the agent must apply the card.

## Post-error sequence

1. Query with keywords from the error (module, API, message).
2. If a card hits, apply it and continue.
3. If none hit, fix and verify, then at task end propose the durable lesson from the outcome.

## Trust rule

When a card and the workspace disagree, prefer the card unless new evidence shows the card is wrong. Then fix the work and propose a corrected card with a new title.

## Examples

### Query before unfamiliar work

```bash
npx knowcards query "payments cents"
```

Prefer a hit such as "amounts are integer cents" over a README that shows floats.

### Propose vs skip (same task)

You learn tests must use `bun test`, fix a one-off rename, and sketch a plan. Task succeeds.

**Propose:** the repo nuance (`bun test`, not npm).
**Skip:** the plan, the local rename, and any guess you did not verify.
