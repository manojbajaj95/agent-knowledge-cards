import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OVERRIDE_FILENAME = "REFLECT.md";

const MISSING_PACKAGED =
  "Propose durable knowledge cards with `npx knowcards propose`. Skip if nothing durable was learned.";

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
    "Before you stop, capture durable knowledge about this codebase that will help later sessions.",
    "Use `npx knowcards propose` (or the knowcards MCP `propose` tool). One atomic fact per card.",
    "Skip if nothing durable was learned.",
    "",
    "--- reflection guidance ---",
    reflectPrompt.trim(),
    "--- end guidance ---",
  ].join("\n");
}
