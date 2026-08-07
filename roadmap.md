# Research roadmap

This document is the research map for agent-knowledge-cards.

Write this document in [ASD-STE 100](https://www.asd-ste100.org/) style: short sentences, one idea per sentence, active voice, and stable terms.

The document records **hypotheses**. A hypothesis is a change that you can test with an A/B eval. The document does not set a fixed work order. Teams can run hypotheses in parallel when they have capacity.

Layer moves are a **judgment** call. Eval results inform the judgment. The document does not define a graduation checklist.

---

## 1. Mission

The project finds a strong hierarchical memory system for coding agents.

Agents rediscover facts, structure, and procedures across sessions. Memory must decrease that cost. Memory must also keep or improve task success.

Continuous evaluation is the judge. If a change does not move eval metrics, the change does not stay.

---

## 2. Method

### 2.1 Hierarchy first, depth by bandwidth

The memory system has layers (see §3).

By default, deepen **L1** first. Squeeze the layer before you open the next layer.

Give L0, L1, L2, L3, and L4 the same catalog treatment in this document. When more people join, run work on more than one layer in parallel.

### 2.2 Orthogonal knobs

Change one knob at a time when you can. Record the knob on every run.

| Knob | Meaning |
|------|---------|
| **Injection** | How memory enters the agent context |
| **Reflection** | How episodes become durable memory |
| **Retrieval** | How the system selects memory for a query or task |
| **Adapters** | How hosts (MCP, hooks, CLI, Pi) call the core |

These knobs let you see which change caused which metric move.

### 2.3 Ops along the way

Ops are cross-cutting actions: reflect, lint, confirm, flag, mark STALE, merge, and related maintenance.

Build Ops with the active layer. Do not wait for a separate Ops phase.

### 2.4 No closed refuse list

This project is young. Do not mark whole approaches as forbidden in advance. Eval and judgment retire weak ideas.

---

## 3. Hierarchy

Layers go from cheap evidence to expensive adaptation.

| Layer | Unit | Role |
|-------|------|------|
| **L0** | Raw episodes and tool traces | Evidence store. Drill-down when a higher layer is not enough. Low priority now. |
| **L1** | Knowledge cards (atomic facts) | Durable truths. Inject as trusted memory. Current v0 focus. |
| **L2** | Skills / SOPs | Procedural know-how. How to do recurring work. |
| **L3** | Wiki / structure / claims | Compiled, linked knowledge about the repo or domain. |
| **L4** | Custom LoRA / fine-tuned models | Weight-level memory. Open when cheaper layers stop moving metrics (judgment). |
| **Ops** | Reflect, lint, confirm, flag, … | Promote, repair, and retire memory across layers. |

**Progressive disclosure:** put a small top view in context. Fetch detail by id when the agent needs it.

**Reflect** is an operation. Reflect is not a layer. Reflect moves content up the stack or revises existing units.

---

## 4. Eval suite (highest priority)

None of the layers help if the eval suite is weak. Treat eval as first work.

### 4.1 Stack

Use **Harbor** plus **Pi** for eval in this repo.

- Harbor runs sandboxed tasks and records trial metadata (model, metrics, artifacts).
- Pi is the agent under test. Harbor reaches Pi through **ACP** (Agent Client Protocol).

Pin the **Harbor version** and the **Pi version** for each experiment series. Harness drift must not look like a memory win.

Harbor already records model and run fields. Do not rebuild that bookkeeping in this repo.

### 4.2 What this repo owns

This repo owns:

1. Task families under [`eval/`](eval/).
2. With/without and per-knob A/B runners.
3. An **experiment run log**: which knob and layer moved which metric.

### 4.3 What this repo does not own

**Continual Learning Bench** lives in `../continual-learning-bench`. Run that bench there when you need it. Do not wire CL-bench into this repository.

External suites (for example SWE-style or planning suites) can plug in later. They are not the spine of this roadmap.

### 4.4 Metrics

Compare arms on:

- reward (task success)
- cost
- duration
- input tokens
- output tokens

Early signal on `repo-map` (structure card, prior agent/model pair): both arms passed; the card cut cost, time, and input tokens. Re-measure under Harbor + Pi with pinned versions.

### 4.5 Ablation matrix

Name these fields on every logged run:

- layer (`L0`…`L4` or `Ops`)
- knob (`injection` | `reflection` | `retrieval` | `adapters`)
- hypothesis id
- Harbor version
- Pi version
- model id (from Harbor)
- task family id
- arm (`with` / `without` / variant name)
- trial index
- metrics

### 4.6 Task families

Build task families as eval hypotheses. Implement by bandwidth.

#### TF-1 — Structure and navigation

**Seed:** `repo-map` in [`eval/templates/repo-map`](eval/templates/repo-map).

**Question:** Does memory that maps the live code path cut explore cost without a reward drop?

**Why it can help:** Agents waste tokens on decoys and legacy trees. A small structure fact points to the live path.

**A/B:** same task; arm A has the structure card (or later wiki claim); arm B does not.

**Cites:** greplica graph context; graphify / codegraph structure queries; current Harbor `repo-map` result.

#### TF-2 — Trust and misleading docs

**Seed:** `payments-cents` in [`eval/templates/payments-cents`](eval/templates/payments-cents).

**Question:** Does a trusted card beat a wrong local README?

**Why it can help:** Agents over-trust files in the workspace. Trusted memory can correct that.

**A/B:** same task; arm A injects the cents rule; arm B sees only the misleading docs.

**Cites:** CL-bench knowledge_cards trusted inject; mozilla cq confirm/flag trust model.

#### TF-3 — Gotcha and workaround

**Question:** Does a short knowledge unit for an undocumented quirk prevent repeated failed attempts?

**Why it can help:** Many session costs come from one unknown API or env fact. Shared KUs target that pain.

**A/B:** task that needs the quirk; arm A has the KU; arm B rediscovers it.

**Cites:** [mozilla-ai/cq](https://github.com/mozilla-ai/cq) query/propose workflow.

#### TF-4 — Multi-session continuity

**Question:** Does a fact learned in episode N improve episode N+1 on a related task?

**Why it can help:** Session memory dies at session end. Durable cards should compound.

**A/B:** two-phase task; arm A keeps notebook across phases; arm B starts cold in phase two.

**Cites:** claude-mem session continuity; Memco lesson reuse; CL-bench reflect-then-reinject.

#### TF-5 — Procedural skill

**Question:** Does an SOP (L2) beat rediscovery on a multi-step workflow?

**Why it can help:** Facts say what is true. Skills say how to act. Some tasks need procedure more than a single fact.

**A/B:** same workflow task; arm A gets a skill; arm B gets cards only or nothing.

**Cites:** skill distillation literature; Tencent skill layering; Trace2Skill / CODESKILL.

### 4.7 Current code vs target

Today [`eval/run.ts`](eval/run.ts) defaults to `terminus-2` and `openai/gpt-5.6-luna`.

**Target for this roadmap:** Harbor + Pi via ACP, with pinned harness versions.

Keep the existing templates as seeds. Change the agent default when the Pi path is ready. Log both the old and the new defaults in the run log during the transition.

### 4.8 Experiment run log

We need a durable log of experiments: config, knob, metrics, and notes.

The log can start as markdown or JSON in-repo. Improve the format when the volume grows.

### 4.9 Experiment compare UX (later decision)

We need a durable way to compare runs and see which knob moved which metric.

Decide how to get that system when you take the task. Do not decide the delivery method in this document.

---

## 5. Hypothesis catalogs

There is no forced order inside a layer. Pick hypotheses by bandwidth and by what the last eval showed.

Each entry uses this shape:

- **Id**
- **Knob**
- **Why it can help**
- **How to A/B**
- **Cite**

### 5.1 L0 — Raw episodes (low priority now)

#### L0-H1 — Offload verbose tool logs

- **Knob:** injection / retrieval
- **Why it can help:** Long tool logs burn the context window. Offload full text. Keep a small index in context.
- **How to A/B:** same long-horizon task; arm A offloads logs and retrieves by id; arm B keeps full logs in context.
- **Cite:** [TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory) symbolic memory and `refs` drill-down.

#### L0-H2 — Mermaid (or similar) task canvas

- **Knob:** injection
- **Why it can help:** A dense state graph can replace prose history for long tasks.
- **How to A/B:** arm A injects a canvas with node ids; arm B injects prose summaries.
- **Cite:** TencentDB-Agent-Memory Mermaid canvas.

### 5.2 L1 — Knowledge cards

L1 is the current product wedge. v0 already has propose, JSON store, substring query, stub reflect, inject formatting, and Harbor with/without seeds.

#### L1-H1 — Real LLM reflection

- **Knob:** reflection
- **Why it can help:** Stub reflect truncates an episode. A real reflect pass can rebuild a useful notebook from a full episode, as in CL-bench.
- **How to A/B:** same multi-session or reflect-then-reuse setup; arm A uses LLM reflect; arm B uses stub or no reflect. Measure phase-two reward and cost.
- **Cite:** [continual-learning-bench knowledge_cards](https://github.com/pgasawa/continual-learning-bench/pull/11); cq `/reflect`.

#### L1-H2 — Full notebook rebuild vs append-only

- **Knob:** reflection
- **Why it can help:** Append-only notebooks grow noise. A rebuild can merge duplicates and drop dead cards.
- **How to A/B:** arm A rebuilds the notebook each reflect; arm B only appends. Measure notebook size, reward, and tokens on a fixed task set.
- **Cite:** CL-bench notebook rebuild pattern.

#### L1-H3 — Budgeted injection

- **Knob:** injection
- **Why it can help:** Too many cards can hurt. Caps on count and characters keep trusted memory cheap.
- **How to A/B:** arm A uses caps; arm B injects all matches. Same task family.
- **Cite:** README roadmap item; claude-mem context configuration.

#### L1-H4 — Progressive disclosure retrieve

- **Knob:** retrieval
- **Why it can help:** An index is cheap. Full bodies are expensive. Fetch bodies only for selected ids.
- **How to A/B:** arm A returns titles/ids first, then bodies on demand; arm B returns full bodies on first query.
- **Cite:** [claude-mem](https://github.com/thedotmack/claude-mem) 3-layer search; Tencent progressive disclosure.

#### L1-H5 — Confirm and flag

- **Knob:** Ops / reflection
- **Why it can help:** Wrong cards poison trust. Confirm and flag let runs endorse or reject cards.
- **How to A/B:** arm A allows confirm/flag and biases retrieval by trust; arm B treats all cards as equal.
- **Cite:** [mozilla-ai/cq](https://github.com/mozilla-ai/cq) `confirm` / `flag`.

#### L1-H6 — STALE and drift marks

- **Knob:** Ops
- **Why it can help:** Code changes. Old facts become false. A STALE mark can demote or hide bad cards.
- **How to A/B:** after a scripted “world change,” arm A marks STALE and demotes; arm B keeps the old card active. Prefer TF-2 style trust tasks.
- **Cite:** cq flag; Memco lesson retirement; Dosu doc freshness.

#### L1-H7 — In-flow propose

- **Knob:** reflection / adapters
- **Why it can help:** End-only reflect misses learnings. Mid-task propose captures gotchas when they appear.
- **How to A/B:** arm A may propose during the task (skill or tool); arm B proposes only at stop.
- **Cite:** cq skill-guided query/propose.

#### L1-H8 — Task-tuned reflect prompts

- **Knob:** reflection
- **Why it can help:** Structure tasks and trust tasks may need different card shapes.
- **How to A/B:** arm A uses a prompt tuned to the task family; arm B uses one generic prompt.
- **Cite:** current README TODO; skill-library specialization patterns.

#### L1-H9 — SQLite and FTS store

- **Knob:** retrieval
- **Why it can help:** Substring search on JSON does not scale. FTS can improve recall and precision.
- **How to A/B:** same query set and tasks; arm A uses SQLite FTS; arm B uses JSON substring.
- **Cite:** claude-mem SQLite + FTS5; cq local SQLite store.

#### L1-H10 — Trusted inject formatting

- **Knob:** injection
- **Why it can help:** The frame around a card can change whether the agent obeys it.
- **How to A/B:** same card body; vary the inject wrapper (trusted-memory block vs plain note vs tool result).
- **Cite:** [`src/adapters/custom-harness.ts`](src/adapters/custom-harness.ts); CL-bench trusted memory inject.

#### L1-H11 — MCP stdio adapter

- **Knob:** adapters
- **Why it can help:** Hosts that speak MCP can query and propose without a custom embed.
- **How to A/B:** same tasks; arm A uses MCP tools for memory; arm B uses instruction inject only (or CLI).
- **Cite:** [`src/mcp/server.ts`](src/mcp/server.ts); cq five MCP tools; Dosu MCP server.

#### L1-H12 — Session hooks adapter

- **Knob:** adapters
- **Why it can help:** SessionStart inject and Stop reflect close the loop without a human command.
- **How to A/B:** arm A uses hooks; arm B uses manual or instruction-only memory.
- **Cite:** [`src/adapters/session-hooks.ts`](src/adapters/session-hooks.ts); claude-mem lifecycle hooks; greplica Cursor/Codex hooks.

### 5.3 L2 — Skills

#### L2-H1 — Distill skills from trajectories

- **Knob:** reflection
- **Why it can help:** Successful traces contain procedures. A skill file can reuse that procedure without a full trace.
- **How to A/B:** TF-5; arm A gets a distilled skill; arm B gets raw trace snippets or nothing.
- **Cite:** Trace2Skill; CODESKILL; Skill-DisCo; Tencent skill generation layering.

#### L2-H2 — Skill versus card inject

- **Knob:** injection
- **Why it can help:** Some tasks need procedure more than a fact. Measure the unit type.
- **How to A/B:** same task; arm A skill only; arm B cards only; optional arm C both.
- **Cite:** skill distillation vs knowledge-card literature; Weng harness / skill-library framing.

#### L2-H3 — Skill bank maintenance

- **Knob:** Ops
- **Why it can help:** Skill banks grow duplicates and dead skills. Merge and drop can keep the bank useful.
- **How to A/B:** arm A runs merge/drop policy; arm B keeps all skills. Measure size, reward, and tokens.
- **Cite:** CODESKILL skill-bank management.

#### L2-H4 — Contrastive skill patches

- **Knob:** reflection
- **Why it can help:** A failure plus a success on the same task can yield a sharper skill patch than success alone.
- **How to A/B:** arm A builds skills from failure/success pairs; arm B summarizes successes only.
- **Cite:** SKILL-KD contrastive skill distillation.

### 5.4 L3 — Wiki and structure

#### L3-H1 — Compiled markdown wiki

- **Knob:** reflection / retrieval
- **Why it can help:** Compile knowledge once into linked pages. Do not re-derive from raw sources on every query.
- **How to A/B:** arm A answers from a maintained wiki; arm B uses only raw files or only cards.
- **Cite:** [Karpathy llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

#### L3-H2 — Wiki lint for gaps and contradictions

- **Knob:** Ops
- **Why it can help:** Lint can find stale claims before the agent trusts them.
- **How to A/B:** arm A runs lint and repairs before the task; arm B skips lint.
- **Cite:** Karpathy llm-wiki ingest / query / lint; Dosu self-documenting updates.

#### L3-H3 — Claims, flows, and components

- **Knob:** retrieval / injection
- **Why it can help:** Structured claims with file anchors can beat flat cards for repo navigation and planning.
- **How to A/B:** TF-1 or planning-style tasks; arm A uses claim packets; arm B uses cards or grep-only.
- **Cite:** [greplica](https://github.com/Autoloops/greplica) `graph context`.

#### L3-H4 — Code knowledge graph queries

- **Knob:** retrieval
- **Why it can help:** AST-level graphs answer “what connects to X” with less reading.
- **How to A/B:** structure tasks; arm A may query a local graph; arm B may not.
- **Cite:** [graphify](https://github.com/Graphify-Labs/graphify); [codegraph](https://github.com/colbymchenry/codegraph).

#### L3-H5 — Wiki index plus drill-down

- **Knob:** injection / retrieval
- **Why it can help:** Inject `index.md` (or equivalent). Fetch article pages only when needed.
- **How to A/B:** arm A index-first; arm B dumps many wiki pages into context.
- **Cite:** Karpathy index.md pattern; graphify `--wiki`; claude-mem progressive disclosure.

### 5.5 L4 — LoRA and fine-tuned models

Open L4 when cheaper layers stop moving metrics. That stop is a judgment call.

Always eval L4 under the same pinned Harbor + Pi stack as L1–L3.

#### L4-H1 — LoRA on successful trajectories

- **Knob:** (weights; compare against injection of text memory)
- **Why it can help:** Weights can absorb stable patterns that text memory keeps re-stating.
- **How to A/B:** arm A frozen base + L1/L2/L3 memory; arm B LoRA adapter; optional arm C both. Same task families.
- **Cite:** agentic skill / trajectory fine-tune literature; contrast with Memco “zero weight updates” results.

#### L4-H2 — Distill skills into weights

- **Knob:** reflection → L4
- **Why it can help:** Text skills may transfer across models. Weights may help one fixed model more. Measure both.
- **How to A/B:** arm A portable skill files on a frozen model; arm B fine-tune/LoRA from the same traces; compare transfer to a second model if possible.
- **Cite:** Trace2Skill portability claims; OPID / on-policy skill distillation.

#### L4-H3 — Memory on, LoRA off versus LoRA on, memory off

- **Knob:** injection vs weights
- **Why it can help:** Separates “context memory” gains from “weight memory” gains.
- **How to A/B:** four arms if budget allows: neither; memory only; LoRA only; both.
- **Cite:** Memco static-RAG vs shared memory study design; classic ablation practice.

### 5.6 Ops — cross-cutting

#### Ops-H1 — End-of-session reflect

- **Knob:** reflection
- **Why it can help:** Catch learnings the in-flow path missed.
- **How to A/B:** arm A always reflects at stop; arm B never reflects at stop (in-flow only or none).
- **Cite:** cq `/reflect`; claude-mem Stop / SessionEnd; greplica working-memory update.

#### Ops-H2 — Query before act

- **Knob:** retrieval / adapters
- **Why it can help:** A forced memory query before broad explore can cut cold-start search.
- **How to A/B:** arm A skill or hook requires query-first; arm B free explore.
- **Cite:** cq skill-guided query; greplica “graph context before explore.”

#### Ops-H3 — Human or agent review gate

- **Knob:** Ops
- **Why it can help:** Review before reuse can raise precision of shared memory.
- **How to A/B:** arm A requires confirm before a card/skill is injectable; arm B auto-accepts.
- **Cite:** Memco review-before-reuse; cq graduation / human review on remote store.

---

## 6. Inspirations

One line each. Hypotheses above cite these where they apply.

| Source | One line |
|--------|----------|
| [mozilla-ai/cq](https://github.com/mozilla-ai/cq) | Shared knowledge units with query, propose, confirm, flag, and optional reflect. |
| [claude-mem](https://github.com/thedotmack/claude-mem) | Session capture, compression, and progressive disclosure back into later sessions. |
| [greplica](https://github.com/Autoloops/greplica) | Repo memory as components, flows, and claims for planning context. |
| [graphify](https://github.com/Graphify-Labs/graphify) | Local knowledge graph and wiki-style pages from code and docs. |
| [codegraph](https://github.com/colbymchenry/codegraph) | Pre-indexed code graph that syncs on change for local agent queries. |
| [TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory) | Layered short-term and long-term memory with symbolic offload. |
| [Karpathy llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) | Compiled markdown wiki between raw sources and queries. |
| [Dosu](https://dosu.dev/) | Team knowledge capture and doc maintenance through agent workflows. |
| [Memco](https://www.memco.ai/) | Shared, reviewed lessons across agents without weight updates. |
| Skill distillation (Trace2Skill, CODESKILL, Skill-DisCo, SKILL-KD, …) | Turn trajectories into reusable procedural skills or patches. |
| [Lilian Weng — Harness](https://lilianweng.github.io/posts/2026-07-04-harness/) | Harness and skill libraries as the measurable agent infrastructure. |
| [CL-bench knowledge_cards](https://github.com/pgasawa/continual-learning-bench/pull/11) | Reflect cards at instance end and reinject as trusted memory. |

---

## 7. Deferred decisions

Record needs here. Decide the delivery method when you take the task.

| Need | Why |
|------|-----|
| Durable experiment compare UX | Run volume will outgrow ad-hoc notes. |
| Pi default wired in [`eval/`](eval/) | Roadmap target is Harbor + Pi; code still defaults to terminus-2. |
| Run-log schema v1 | Ablation fields must stay stable across contributors. |
| Multi-trial stats helpers | Single trials are noisy; families need repeat runs. |
| How to store L3 artifacts | Wiki files vs DB vs hybrid — decide when L3 work starts. |
| How to train and serve L4 adapters | Decide when L4 work starts; keep Harbor + Pi eval pinned. |

---

## 8. How to add a hypothesis

1. Give the hypothesis an id (`L1-H13`, `TF-6`, …).
2. Name the knob and the layer (or task family).
3. Write why it can help in short sentences.
4. Write the A/B arms.
5. Cite an inspiration when one exists.
6. Open a PR that edits this file, or open an issue that links the new entry.

See also [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## 9. Relation to the current codebase

| Area | Now | Roadmap pull |
|------|-----|--------------|
| Core cards | JSON notebook, propose, substring query, stub reflect | L1 hypotheses |
| Adapters | Inject helper; session-hook stubs; MCP handlers without stdio | L1-H10…H12 |
| Eval | Harbor with/without; `repo-map`; `payments-cents`; terminus-2 default | §4 task families; Pi target |
| CL-bench | Design ancestor; not wired here | Manual runs in sibling repo |

Keep the v0 path working when you pull a hypothesis forward.
