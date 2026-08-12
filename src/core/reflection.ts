import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Episode, KnowledgeLibrary } from "./types/index.ts";

const OVERRIDE_FILENAME = "REFLECT.md";

const BUILTIN_DEFAULT = `You maintain a notebook of durable knowledge cards for a coding agent that will face later sessions in this repo. Given this completed session, propose cards worth keeping.

Prefer concrete reusable state the later agent can apply without re-deriving: repo conventions, encodings, constraints, module ownership, and other durable facts from the session outcome. Prefer state over vague strategy slogans.

Do NOT store low-value cards: response-schema reminders, generic advice without concrete facts, full transcripts or raw dumps, ephemeral one-session plans, or steps you already finished.

Write each card for the next acting agent. Start each card with a short "Use when:" line stating when the card applies, then the durable content. Prefer fewer, consistent cards. Merge near-duplicates in your head; if a card already covers the fact, skip it. If coverage is unknown, say so briefly — do not invent facts.

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
    "Before you stop, reflect on this session and propose durable knowledge cards if needed.",
    "Use `npx knowcards propose` (or the knowcards MCP `propose` tool). One atomic fact per card.",
    "Skip if nothing durable was learned. Near-duplicates are acceptable for now.",
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
