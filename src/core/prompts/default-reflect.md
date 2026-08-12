Capture durable knowledge about this codebase (and its domain) that will help later sessions. Reflect on what this session taught about the codebase — not on the particular task.

Propose cards only when the fact will speed or protect later work:

Architecture
- What owns what; where live code lives vs dead or decoy paths
- Important boundaries (packages, services, layers) and what must not cross them

Dependencies & contracts
- Libraries, APIs, formats, units, and invariants callers must respect
- Version or platform constraints that bite if ignored

Gotchas
- Misleading docs, traps, and surprises proven this session
- Failure modes that look like something else

Conventions
- How this repo builds, tests, names, and ships (commands and patterns in use)

Undocumented why
- Decisions that are not in the README but explain the shape of the code
- Prefer the reason plus the rule, not a history essay

Do / don't
- Concrete actions for this repo: what to do, what to avoid, and when

Prefer concrete state over slogans. Prefer the outcome (what proved true) over the path you took.

Do NOT propose: session plans, TODOs, full diffs, stack traces, raw dumps, generic advice with no repo fact, guesses you did not verify, or near-duplicates of cards you already hold (query first if unsure).

Card shape for propose:
- --title: clear, unique, slug-friendly
- body: one short durable fact (imperative when useful)

If nothing durable was learned, propose nothing.
