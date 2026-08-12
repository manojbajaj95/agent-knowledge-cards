import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Episode, KnowledgeLibrary } from "./types/index.ts";

const OVERRIDE_FILENAME = "REFLECT.md";

const BUILTIN_DEFAULT = `Capture durable knowledge about this codebase (and its domain) that will help later sessions. Reflect on what this session taught about the codebase — not on the particular task.

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
`;

/**
 * Load the reflection prompt: project-root REFLECT.md if present, else packaged default.
 */
export async function loadReflectPrompt(
  cwd: string = process.cwd(),
): Promise<string> {
  const overridePath = join(cwd, OVERRIDE_FILENAME);
  try {
    const text = (await readFile(overridePath, "utf8")).trim();
    if (text) return text;
  } catch {
    // missing override is fine
  }
  return loadPackagedDefault();
}

async function loadPackagedDefault(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  const packaged = join(here, "prompts", "default-reflect.md");
  try {
    const text = (await readFile(packaged, "utf8")).trim();
    if (text) return text;
  } catch {
    // fall through to embedded copy (dev / missing file)
  }
  return BUILTIN_DEFAULT.trim();
}

/**
 * Build the follow-up text the host agent should run at Stop.
 * The agent writes cards via knowcards propose / MCP — knowcards does not call an LLM.
 */
export function formatReflectFollowup(reflectPrompt: string): string {
  return [
    "KNOWLEDGE CARDS — end-of-session reflection",
    "",
    "Before you stop, capture durable knowledge about this codebase that will help later sessions.",
    "Use `npx knowcards propose` (or the knowcards MCP `propose` tool). One atomic fact per card.",
    "Skip if nothing durable was learned.",
    "",
    "--- reflection guidance ---",
    reflectPrompt.trim(),
    "--- end guidance ---",
  ].join("\n");
}

/**
 * @deprecated In-process notebook rewrite is not used. Hosts call
 * {@link formatReflectFollowup} so the primary agent proposes cards.
 * Kept for API stability; returns the library unchanged.
 */
export function reflect(
  library: KnowledgeLibrary,
  _episode: Episode,
): KnowledgeLibrary {
  return library;
}
