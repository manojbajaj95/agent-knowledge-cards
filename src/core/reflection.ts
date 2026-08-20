import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OVERRIDE_FILENAME = "REFLECT.md";

const MISSING_PACKAGED =
  "Propose at most 2 durable cards with `npx knowcards propose`. Default is skip.";

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
    // fall through if packaged file is missing (dev / incomplete build)
  }
  return MISSING_PACKAGED;
}

/**
 * Build the follow-up text the host agent should run at Stop.
 * The agent writes cards via knowcards propose / MCP — knowcards does not call an LLM.
 */
export function formatReflectFollowup(reflectPrompt: string): string {
  return [
    "KNOWLEDGE CARDS — end-of-session reflection",
    "",
    "Default is skip. Propose at most 2 cards that later sessions will reuse.",
    "Use `npx knowcards propose` (or the knowcards MCP `propose` tool).",
    "If the next session would act the same without the card, propose nothing.",
    "",
    "--- reflection guidance ---",
    reflectPrompt.trim(),
    "--- end guidance ---",
  ].join("\n");
}
