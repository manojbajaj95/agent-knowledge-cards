---
name: knowcards
description: |
  INVOKE WHEN:
  - Starting a coding task — query knowcards first
  - About to explore broadly, touch auth/payments/CI, or fix a non-obvious error — query before acting or retrying
  - After a coding task is completed and verified — propose durable facts you proved (path, constraint, preferred command, API quirk)

  SKIP WHEN:
  - You already queried knowcards for this exact topic earlier in this session
  - The task is a routine edit in code you already hold in context and no new fact was proven
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

1. **Before acting** — Run `npx knowcards query` with task keywords. Skip only for routine edits in code you already work on in this session.
2. **Apply hits** — Prefer card facts while you work. Verify against the repo when the card may be old.
3. **Propose after the task is completed and verified** — Once the work is done and checked (tests, build, or the user-accepted outcome), propose each durable fact you proved. Do not propose mid-task guesses. If a card was wrong, propose a corrected card with a new title (update/delete are not available).

**Rationalization check (query).** If you think "I already know this" or "I have a plan, I will just write files," stop and query. A plan for *what* to write is not the same as knowing the repo gotchas.

**Rationalization check (propose).** If you think "I will skip cards because the fix already shipped," stop. After verify, propose the durable facts before you close the task.

## When to query

Query when:

- The task starts in an unfamiliar area of the repo.
- You are about to fix an error query **before** the first retry.
- Work touches auth, payments, CI, packaging, or config that docs often get wrong.

Do not query when:

- You already queried this exact topic earlier in the session.
- The edit is routine in files you already hold in context.
- You only need a standard-library call in the project language.

Use short keywords (module names, APIs, error text, paths). Prefer a focused query over an empty query when the library is large. If hits are empty, explore as usual.

## When to propose

Propose when the fact will help a later session in **this** repo:

- Auth or header rules
- Money or unit constraints
- Preferred commands (`bun test`, not npm)
- Live paths or APIs that docs get wrong
- Multi-attempt fixes whose solution was not obvious

Do not propose:

- Transient plans or guesses
- Full chat transcripts
- Facts you already proposed this session
- Near-duplicates — query first; if a card already covers it, skip

Write one atomic fact per card.

```bash
npx knowcards propose \
  --title "Payment amounts are integer cents" \
  --use-when "touching the payments module" \
  "Amounts are stored as integer cents; never use floating point for money."
```

Card shape:

- **Title** — clear and unique. The filename slug comes from the title. Duplicate titles fail.
- **Body** — one short durable fact. Prefer an imperative action when useful (`Use integer cents…`).
- `--use-when` — when the agent must apply the card.

## Post-error sequence

1. Query with keywords from the error (module, API, message).
2. If a card hits, apply it and continue.
3. If none hit, fix and verify the issue, then propose the durable lesson.

## Trust rule

When a card and the workspace disagree, prefer the card unless new evidence shows the card is wrong. Then fix the work and propose a corrected card with a new title.

## Examples

### Query before payments work

```bash
npx knowcards query "payments cents"
```

Prefer a hit such as "amounts are integer cents" over a README that shows floats.

### Propose after the task is verified

You finish auth work and verify it. JWTs must use the `Authorization` Bearer header and refresh tokens use cookie `rt`.

```bash
npx knowcards propose \
  --title "Auth uses Bearer JWT and rt cookie" \
  --use-when "editing auth middleware" \
  "Session tokens live in the Authorization header as Bearer JWTs; refresh tokens are httpOnly cookies named rt."
```
