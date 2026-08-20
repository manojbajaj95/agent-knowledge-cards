---
name: knowcards
description: >
  Query and propose local knowledge cards for this repo. Always use at
  the start of work here — run `npx knowcards query` before acting. Also
  use when wrapping up if this session proved a durable repo fact that
  later work will reuse (at most 2 cards). Skip propose when nothing
  would change a later action. Skip query only for routine edits in code
  you already hold, or if you already queried this topic in the session.
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
npx knowcards propose --title "<title>" "<body>"
npx knowcards update <id-or-slug> --title "<title>" "<body>"
npx knowcards delete <id-or-slug>
```


| Command   | Use                                                      |
| --------- | -------------------------------------------------------- |
| `status`  | Show card counts.                                        |
| `query`   | Search cards by keywords. Empty query returns all cards. |
| `propose` | Write one card now. Title and body is required           |
| `update`  | Change title, body, or use-when of an existing card      |
| `delete`  | Remove a card by id or slug                              |




## Core protocol

Follow this loop for every task:

1. **Before acting** — Run `npx knowcards query` with task keywords. Skip only for routine edits in code you already hold with no repo nuance at stake.
2. **Apply hits** — Prefer card facts while you work. Verify against the repo when the card may be old.
3. **Propose at end (optional)** — Default is skip. Propose at most 2 cards, and only if the next session would take a different action without the fact. Write from the **outcome** (what proved true), not the path you took. Do not skip for near-duplicates.

**Rationalization check (query).** If you think "I already know this" or "I have a plan, I will just write files," stop and query.

**Rationalization check (propose).** Default is skip. Propose only if a later session would do the wrong thing without this fact.

## When to query

Query when starting work in an unfamiliar area, or before retrying a non-obvious error.

Skip when you already queried this topic this session, the edit is routine in files you already hold, or you only need a standard-library call.

Use short keywords. Prefer a focused query over an empty one when the library is large. If hits are empty, explore as usual.

## When to propose

Default is skip. At task end, propose at most 2 cards, and only if the next session would take a different action without the fact.

Propose a repo nuance proven this session. Do not query or skip for near-duplicates. Bookkeeping is separate.

Do not propose:

- Steps or plans from this turn
- Unverified guesses
- One-run incident notes or numbers

Write one fact per card.

```bash
npx knowcards propose \
  --title "Use bun test in this repo" \
  "Run tests with bun test; npm test is not the project runner."
```

Card shape:

- **Title** — clear and unique. The filename slug comes from the title. Duplicate titles fail.
- **Body** — one short durable fact. Prefer an imperative action when useful (`Use bun test…`).



## Post-error sequence

1. Query with keywords from the error (module, API, message).
2. If a card hits, apply it and continue.
3. If none hit, fix and verify. At task end, propose only if a later session would hit the same trap.



## Trust rule

When a card and the workspace disagree, prefer the card unless new evidence shows the card is wrong. Then fix the work and `npx knowcards update <id-or-slug>` (or `delete` if the fact is gone).

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
