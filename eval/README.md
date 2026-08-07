# Eval

Compare a coding agent **with** vs **without** pre-seeded knowledge cards on the same task.

## Status

**TODO** — not runnable yet. Fixtures live under `fixtures/` for when the harness lands.

## Planned shape

1. Seed cards from `fixtures/sample-cards.json` (or task-specific fixtures).
2. Run the same coding task twice:
   - **with cards** — inject via `formatCardsForInject` / session-start adapter
   - **without cards** — empty notebook / no inject
3. Score outcomes (pass/fail, steps, tokens) and report the delta.

## TODOs

- [ ] Pick a small coding task + sandbox repo
- [ ] Scripted or LLM/Cursor-agent harness
- [ ] CLI: `bun run eval -- with-cards | without-cards`
- [ ] Capture artifacts (trace, final score)
