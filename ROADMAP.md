# Research roadmap

Product shape: [README.md](README.md#product). Eval method: [eval/README.md](eval/README.md).

This file lists **testable knobs**. A hypothesis is a change you can A/B. Eval is the judge.

**Focus:** L1 knowledge cards. Squeeze L1 before you build L2 or L3.

---

## Knobs

One flat list. Memory ops and usage paths are both knobs.

| Knob | Box | Meaning |
| ---- | --- | ------- |
| **init** | memory | First fill / onboard a layer (not wired) |
| **ingest** | memory | How to store a unit at this layer |
| **storage** | memory | Backend (files vs database) |
| **retrieve** | memory | How to select and format memory for a query |
| **reflect** | memory | How to extract / promote from the layer below |
| **maintain** | memory | Merge, dedupe, STALE, confirm, flag |
| **hooks** | usage | Session inject + Stop reflect on a host |
| **plugin** | usage | Agent plugin / host skill bundle |
| **mcp** | usage | MCP tools for query / propose |

Change one knob at a time when you can. Record the knob on every run.

---

## Layers (ids only)

See the triangle in [README.md](README.md#product). Hypothesis ids use these ranks:

| Layer | Unit | Status |
| ----- | ---- | ------ |
| **L0** | Chats (host sessions) | We do not store these. Promote in-place. |
| **L1** | Atomic units (knowledge cards) | v0 focus |
| **L2** | Compiled: procedural skill \| wiki \| graph | Not in code |
| **L3** | Weights | Not in code |

---

## Hypothesis catalogs

No forced order inside a layer. Pick by bandwidth and by the last eval.

Each entry:

- **Id**
- **Knob**
- **Why it can help**
- **How to A/B**
- **Cite**

### L0 — Chats (low priority)

We do not store L0. Hosts already keep sessions. These entries wait until we need an L0 store.

#### L0-H1 — Offload verbose tool logs

- **Knob:** retrieve
- **Why it can help:** Long tool logs burn the context window. Offload full text. Keep a small index in context.
- **How to A/B:** same long-horizon task; arm A offloads logs and retrieves by id; arm B keeps full logs in context.
- **Cite:** [TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory) symbolic memory and `refs` drill-down.

#### L0-H2 — Mermaid (or similar) task canvas

- **Knob:** retrieve
- **Why it can help:** A dense state graph can replace prose history for long tasks.
- **How to A/B:** arm A injects a canvas with node ids; arm B injects prose summaries.
- **Cite:** TencentDB-Agent-Memory Mermaid canvas.

### L1 — Knowledge cards

v0 is filesystem-first: markdown cards under `.agents/knowledge_cards`, ingest via `propose` (required title → slug), MiniSearch (BM25+) retrieve, title-first inject, Harbor with/without seeds, and **agent-follow-up reflect** via host Stop hooks (`knowcards install`). Separate-LLM notebook rebuild and dedupe/merge remain open.

#### L1-H1 — Real LLM reflection

- **Knob:** reflect
- **Why it can help:** A dedicated reflector LLM can rebuild a notebook from a full episode, as in CL-bench, without relying on the primary agent’s Stop turn.
- **Status:** Deferred. v0 uses primary-agent follow-up (no bundled model). Keep this hypothesis for a later A/B against agent-follow-up.
- **How to A/B:** same multi-session or reflect-then-reuse setup; arm A uses LLM reflect; arm B uses agent-follow-up or no reflect. Measure phase-two reward and cost.
- **Cite:** [continual-learning-bench knowledge_cards](https://github.com/pgasawa/continual-learning-bench/pull/11); cq `/reflect`.

#### L1-H2 — Full notebook rebuild vs append-only

- **Knob:** maintain
- **Why it can help:** Append-only notebooks grow noise. A rebuild can merge duplicates and drop dead cards.
- **Status:** v0 is append-only via agent `propose`. Near-duplicates after automatic reflect are accepted for now; tackle here later.
- **How to A/B:** arm A rebuilds the notebook each reflect; arm B only appends. Measure notebook size, reward, and tokens on a fixed task set.
- **Cite:** CL-bench notebook rebuild pattern.

#### L1-H3 — Budgeted injection

- **Knob:** retrieve
- **Why it can help:** Too many cards can hurt. Caps on count and characters keep trusted memory cheap.
- **Status:** Shipped. `onSessionPrompt` applies `INJECT_CARD_CAP` (8) and `INJECT_CHAR_CAP` (8000) after retrieve. CLI/MCP query stay uncapped.
- **How to A/B:** arm A uses caps; arm B injects all matches. Same task family.
- **Cite:** claude-mem context configuration.

#### L1-H4 — Progressive disclosure retrieve

- **Knob:** retrieve
- **Why it can help:** An index is cheap. Full bodies are expensive. Fetch bodies only for selected ids.
- **Status:** Inject default is **title-first** (slug, title, optional use-when). Full bodies stay on disk; the agent fetches them with `knowcards query` or MCP `query`.
- **How to A/B:** same task family; arm A title-first inject (current `formatCardsForInject`); arm B full card bodies in the inject block. Harbor with-arm copies full card files to disk — that does not measure this knob. The arms must differ in inject wording (hooks or an equivalent prompt block), then compare reward, cost, and input tokens.
- **Cite:** [claude-mem](https://github.com/thedotmack/claude-mem) 3-layer search; Tencent progressive disclosure.

#### L1-H5 — Confirm and flag

- **Knob:** maintain
- **Why it can help:** Wrong cards poison trust. Confirm and flag let runs endorse or reject cards.
- **How to A/B:** arm A allows confirm/flag and biases retrieval by trust; arm B treats all cards as equal.
- **Cite:** [mozilla-ai/cq](https://github.com/mozilla-ai/cq) `confirm` / `flag`.

#### L1-H6 — STALE and drift marks

- **Knob:** maintain
- **Why it can help:** Code changes. Old facts become false. A STALE mark can demote or hide bad cards.
- **How to A/B:** after a scripted “world change,” arm A marks STALE and demotes; arm B keeps the old card active. Prefer TF-2 style trust tasks.
- **Cite:** cq flag; Memco lesson retirement; Dosu doc freshness.

#### L1-H7 — In-flow propose

- **Knob:** ingest
- **Why it can help:** End-only reflect misses learnings. Mid-task propose captures gotchas when they appear.
- **How to A/B:** arm A may propose during the task (plugin or tool); arm B proposes only at stop.
- **Cite:** cq skill-guided query/propose.

#### L1-H8 — Task-tuned reflect prompts

- **Knob:** reflect
- **Why it can help:** Structure tasks and trust tasks may need different card shapes.
- **How to A/B:** arm A uses a prompt tuned to the task family; arm B uses one generic prompt.
- **Cite:** skill-library specialization patterns.

#### L1-H9 — Database storage for multiplayer and production

- **Knob:** storage
- **Why it can help:** The filesystem backend is single-machine and file-based. Multiplayer and production need a shared database behind `CardStorage` instead of local markdown files.
- **How to A/B:** same card content and tasks; arm A uses `FsCardStorage`; arm B uses a database `CardStorage`. Measure correctness, latency, and multi-writer safety when relevant.
- **Cite:** `CardStorage` in `[src/core/storage.ts](src/core/storage.ts)`; cq local SQLite store; claude-mem SQLite.

#### L1-H10 — Trusted inject formatting

- **Knob:** retrieve
- **Why it can help:** The frame around a card can change whether the agent obeys it.
- **How to A/B:** same card body; vary the inject wrapper (trusted-memory block vs plain note vs tool result).
- **Cite:** `[src/core/inject.ts](src/core/inject.ts)`; CL-bench trusted memory inject.

#### L1-H11 — MCP stdio

- **Knob:** mcp
- **Why it can help:** Hosts that speak MCP can query and propose without a custom embed.
- **How to A/B:** same tasks; arm A uses MCP tools for memory; arm B uses instruction inject only (or CLI).
- **Cite:** `[src/mcp/server.ts](src/mcp/server.ts)`; cq five MCP tools; Dosu MCP server.

#### L1-H12 — Session hooks

- **Knob:** hooks
- **Why it can help:** First-prompt inject and Stop reflect close the loop without a human command.
- **Status:** Shipped for Claude Code, Cursor, and Codex via `knowcards install` + `src/adapters/*` (agent-follow-up reflect; no `knowcards hook` CLI). Empty retrieve skips additionalContext (Cursor keeps the last rules file). Claude Code / Codex dedupe by session slug so additive `additionalContext` does not restack the same cards. Cursor skips rewrite when the rules file would not change.
- **Host notes:** Cursor `beforeSubmitPrompt` cannot inject context — inject writes `.cursor/rules/knowcards-context.mdc`. Cursor Stop `followup_message` is a user message (sync; no idle wake). Codex Stop uses `decision: "block"` + `reason` as a new user prompt (sync; async hooks do not start a turn). Claude Code Stop uses `async` + `asyncRewake` and exit 2 + stderr so reflect continues the same idle session (KV cache) without blocking the user-facing turn. Stop skips when `stop_hook_active`, Cursor `loop_count > 0`, or a transcript path has no Write/Edit.
- **Deferred:** SessionStart re-prime after compact/resume/clear; near-duplicate merge after reflect. Cursor/Codex background same-session reflect needs host APIs ([Cursor forum](https://forum.cursor.com/t/let-a-stop-hook-run-end-of-turn-work-without-rendering-below-the-final-answer/165472), [Codex #38221](https://github.com/openai/codex/issues/38221), [Claude Code #76721](https://github.com/anthropics/claude-code/issues/76721#issuecomment-5269953313)).
- **How to A/B:** arm A uses hooks; arm B uses manual or instruction-only memory.
- **Cite:** `[src/lifecycle/session.ts](src/lifecycle/session.ts)`; `[src/adapters/](src/adapters/)`; claude-mem lifecycle hooks; greplica Cursor/Codex hooks.

#### L1-H13 — Improve retrieval quality

- **Knob:** retrieve
- **Why it can help:** Substring match over loaded cards is weak. Better ranking, FTS, or light semantic match can raise precision and recall without changing card content.
- **How to A/B:** fixed query set and tasks; arm A uses current retrieve; arm B uses the improved retriever. Measure hit rate, injected tokens, reward, and cost.
- **Cite:** claude-mem SQLite + FTS5; progressive disclosure (L1-H4).
- **Status:** v0 uses MiniSearch (BM25+) over the in-memory library (filesystem-backed cards). Inject is title-first (L1-H4). Further gains (boost tuning, embeddings) remain open. Do not add vectors, graphs, or hybrid search without discussion.

#### L1-H14 — Agent plugin

- **Knob:** plugin
- **Why it can help:** A plugin (`plugin.json`, `skills/`, `mcp.json`) teaches hosts when and how to init, query, propose, and inject cards via CLI or MCP. Compatible clients can load the same bundle without per-client rearrangement.
- **How to A/B:** same coding tasks; arm A installs the knowledge-cards Agent Plugin (plugin + MCP); arm B has MCP/CLI available but no plugin. Optional arm C: host skill file only vs full plugin. Measure reward, cost, and whether cards are queried or proposed.
- **Cite:** [Agent Plugins](https://agent-plugins.org/); [Agent Skills](https://agentskills.io/specification); cq skill-guided query/propose; `[src/cli/](src/cli/)`; `[src/mcp/](src/mcp/)`.

#### L1-H15 — End-of-session reflect

- **Knob:** reflect
- **Why it can help:** Catch learnings the in-flow path missed.
- **Status:** Shipped as Stop follow-up: host continues with default/`REFLECT.md` prompt; the primary agent proposes cards. No bundled LLM. Stop is quieter when the host transcript has no Write/Edit (or Cursor `loop_count > 0` / `stop_hook_active`).
- **Deferred:** dedupe/merge of near-duplicate cards; full notebook rebuild (see L1-H2); separate-LLM reflect (L1-H1).
- **How to A/B:** arm A always reflects at stop; arm B never reflects at stop (in-flow only or none).
- **Cite:** cq `/reflect`; claude-mem Stop / SessionEnd; greplica working-memory update.

#### L1-H16 — Query before act

- **Knob:** plugin
- **Why it can help:** A forced memory query before broad explore can cut cold-start search.
- **How to A/B:** arm A plugin or hook requires query-first; arm B free explore.
- **Cite:** cq skill-guided query; greplica “graph context before explore.”

#### L1-H17 — Human or agent review gate

- **Knob:** maintain
- **Why it can help:** Review before reuse can raise precision of shared memory.
- **How to A/B:** arm A requires confirm before a card is injectable; arm B auto-accepts.
- **Cite:** Memco review-before-reuse; cq graduation / human review on remote store.

### L2 — Compiled (procedural skill | wiki | graph)

Not in code. Cards distill into one of these types. A procedural skill is not the host **plugin**.

#### L2-H1 — Distill procedural skills from trajectories

- **Knob:** reflect
- **Why it can help:** Successful traces contain procedures. A skill file can reuse that procedure without a full trace.
- **How to A/B:** TF-5; arm A gets a distilled skill; arm B gets raw trace snippets or nothing.
- **Cite:** Trace2Skill; CODESKILL; Skill-DisCo; Tencent skill generation layering.

#### L2-H2 — Procedural skill versus card inject

- **Knob:** retrieve
- **Why it can help:** Some tasks need procedure more than a fact. Measure the unit type.
- **How to A/B:** same task; arm A skill only; arm B cards only; optional arm C both.
- **Cite:** skill distillation vs knowledge-card literature; Weng harness / skill-library framing.

#### L2-H3 — Skill bank maintenance

- **Knob:** maintain
- **Why it can help:** Skill banks grow duplicates and dead skills. Merge and drop can keep the bank useful.
- **How to A/B:** arm A runs merge/drop policy; arm B keeps all skills. Measure size, reward, and tokens.
- **Cite:** CODESKILL skill-bank management.

#### L2-H4 — Contrastive skill patches

- **Knob:** reflect
- **Why it can help:** A failure plus a success on the same task can yield a sharper skill patch than success alone.
- **How to A/B:** arm A builds skills from failure/success pairs; arm B summarizes successes only.
- **Cite:** SKILL-KD contrastive skill distillation.

#### L2-H5 — Compiled markdown wiki

- **Knob:** reflect
- **Why it can help:** Compile knowledge once into linked pages. Do not re-derive from raw sources on every query.
- **How to A/B:** arm A answers from a maintained wiki; arm B uses only raw files or only cards.
- **Cite:** [Karpathy llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

#### L2-H6 — Wiki lint for gaps and contradictions

- **Knob:** maintain
- **Why it can help:** Lint can find stale claims before the agent trusts them.
- **How to A/B:** arm A runs lint and repairs before the task; arm B skips lint.
- **Cite:** Karpathy llm-wiki ingest / query / lint; Dosu self-documenting updates.

#### L2-H7 — Claims, flows, and components

- **Knob:** retrieve
- **Why it can help:** Structured claims with file anchors can beat flat cards for repo navigation and planning.
- **How to A/B:** TF-1 or planning-style tasks; arm A uses claim packets; arm B uses cards or grep-only.
- **Cite:** [greplica](https://github.com/Autoloops/greplica) `graph context`.

#### L2-H8 — Code knowledge graph queries

- **Knob:** retrieve
- **Why it can help:** AST-level graphs answer “what connects to X” with less reading.
- **How to A/B:** structure tasks; arm A may query a local graph; arm B may not.
- **Cite:** [graphify](https://github.com/Graphify-Labs/graphify); [codegraph](https://github.com/colbymchenry/codegraph).

#### L2-H9 — Wiki index plus drill-down

- **Knob:** retrieve
- **Why it can help:** Inject `index.md` (or equivalent). Fetch article pages only when needed.
- **How to A/B:** arm A index-first; arm B dumps many wiki pages into context.
- **Cite:** Karpathy index.md pattern; graphify `--wiki`; claude-mem progressive disclosure.

### L3 — Weights

Open L3 when cheaper layers stop moving metrics. That stop is a judgment call.

Always eval L3 under the same pinned Harbor stack as L1–L2.

#### L3-H1 — LoRA on successful trajectories

- **Knob:** retrieve (compare weights against injected text memory)
- **Why it can help:** Weights can absorb stable patterns that text memory keeps re-stating.
- **How to A/B:** arm A frozen base + L1/L2 memory; arm B LoRA; optional arm C both. Same task families.
- **Cite:** agentic skill / trajectory fine-tune literature; contrast with Memco “zero weight updates” results.

#### L3-H2 — Distill procedural skills into weights

- **Knob:** reflect
- **Why it can help:** Text skills may transfer across models. Weights may help one fixed model more. Measure both.
- **How to A/B:** arm A portable skill files on a frozen model; arm B fine-tune/LoRA from the same traces; compare transfer to a second model if possible.
- **Cite:** Trace2Skill portability claims; OPID / on-policy skill distillation.

#### L3-H3 — Memory on, LoRA off versus LoRA on, memory off

- **Knob:** retrieve
- **Why it can help:** Separates “context memory” gains from “weight memory” gains.
- **How to A/B:** four arms if budget allows: neither; memory only; LoRA only; both.
- **Cite:** Memco static-RAG vs shared memory study design; classic ablation practice.

---

## Task families

Build task families as eval hypotheses. Implement by bandwidth. Details live in [eval/README.md](eval/README.md).

| Id | Seed | Question |
| -- | ---- | -------- |
| **TF-1** | `repo-map` | Does memory that maps the live code path cut explore cost without a reward drop? |
| **TF-2** | `payments-cents` | Does a trusted card beat a wrong local README? |
| **TF-3** | (none yet) | Does a short knowledge unit for an undocumented quirk prevent repeated failed attempts? |
| **TF-4** | (none yet) | Does a fact learned in episode N improve episode N+1 on a related task? |
| **TF-5** | (none yet) | Does an L2 procedural skill beat rediscovery on a multi-step workflow? |

Name these fields on every logged run: layer, knob, hypothesis id, Harbor version, model id, task family, arm, trial index, metrics (reward, cost, duration, input tokens, output tokens).

---

## How to add a hypothesis

1. Give the hypothesis an id (`L1-H18`, `TF-6`, …).
2. Name one knob from the table above.
3. Write why it can help in short sentences.
4. Write the A/B arms.
5. Cite an inspiration when one exists.
6. Open a PR that edits this file, or open an issue that links the new entry.

See also [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Relation to the current codebase

| Area | Now | Roadmap pull |
| ---- | --- | ------------ |
| Core cards | Filesystem markdown under `.agents/knowledge_cards`; propose+title→slug; MiniSearch BM25+; agent-follow-up reflect (`REFLECT.md` override) | L1 hypotheses; L1-H9 DB swap; L1-H13 further retrieve; L1-H1 separate LLM; L1-H2 dedupe/rebuild |
| Storage | `FsCardStorage` behind `CardStorage` | L1-H9 database |
| Lifecycle | Title-first prompt inject (count/char caps, skip empty, slug dedupe); Stop reflect skips when transcript has no edits | L1-H4 full-body A/B; L1-H10…H12 polish; SessionStart re-prime; L1-H14 plugin |
| Eval | Harbor with/without via on-disk cards in the with-arm env. **Primary gate for this slice**. | Agent A/B (same task; prompt+MCP) — see [eval/README.md](eval/README.md) |
| CL-bench | Design ancestor; not wired here | Manual runs in sibling repo |

Keep the v0 path working when you pull a hypothesis forward.
