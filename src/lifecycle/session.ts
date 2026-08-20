/**
 * Memory session API: retrieve + format on prompt, reflect follow-up on stop.
 * Host adapters wrap these strings into Claude Code / Cursor / Codex / Pi envelopes.
 */

import { formatCardsForInject } from "../core/inject.ts";
import {
  formatReflectFollowup,
  loadReflectPrompt,
  REFLECT_FOLLOWUP_TITLE,
} from "../core/reflection.ts";
import { queryLibrary } from "../core/retrieval.ts";
import { openLibrary } from "../core/storage.ts";
import { DEFAULT_CARDS_ROOT, type KnowledgeCard } from "../core/types/index.ts";

export { REFLECT_FOLLOWUP_TITLE };

/** Max cards per inject. */
export const INJECT_CARD_CAP = 8;

/** Stay under Cursor/Claude ~10k additionalContext inline cap. */
export const INJECT_CHAR_CAP = 8000;

function budgetInjectCards(cards: KnowledgeCard[]): KnowledgeCard[] {
  let out = cards.slice(0, INJECT_CARD_CAP);
  while (out.length > 1 && formatCardsForInject(out).length > INJECT_CHAR_CAP) {
    out = out.slice(0, -1);
  }
  return out;
}

export type SessionPromptOptions = {
  /** Cards root (default `.agents/knowledge_cards`). */
  root?: string;
  /** Project cwd for path resolution (unused today; reserved). */
  cwd?: string;
  /** Additive hosts: omit slugs already injected this session. */
  skipSlugs?: Iterable<string>;
};

/** Retrieve + format for a prompt. Empty `text` means skip host inject. */
export type SessionPromptResult = {
  text: string;
  slugs: string[];
};

export type SessionStopOptions = {
  /** Project cwd — used to load `REFLECT.md` override. */
  cwd?: string;
  root?: string;
};

/**
 * First-prompt inject: retrieve cards for the user message and format trusted memory.
 * Empty query, no hits, or all hits skipped yields `{ text: "", slugs: [] }`
 * (hosts skip additionalContext).
 */
export async function onSessionPrompt(
  userText: string,
  options: SessionPromptOptions = {},
): Promise<SessionPromptResult> {
  const root = options.root ?? DEFAULT_CARDS_ROOT;
  const q = userText.trim();
  if (!q) return { text: "", slugs: [] };
  const skip = new Set(options.skipSlugs ?? []);
  const { library } = await openLibrary(root);
  const cards = budgetInjectCards(
    queryLibrary(library, q).filter((c) => !skip.has(c.slug)),
  );
  return {
    text: formatCardsForInject(cards),
    slugs: cards.map((c) => c.slug),
  };
}

/**
 * Stop-style: return the reflection follow-up for the primary agent.
 * Does not call an LLM or write cards.
 */
export async function onSessionStop(
  _episodeText?: string,
  rootOrOptions: string | SessionStopOptions = {},
): Promise<string> {
  const options: SessionStopOptions =
    typeof rootOrOptions === "string" ? { root: rootOrOptions } : rootOrOptions;
  const cwd = options.cwd ?? process.cwd();
  const prompt = await loadReflectPrompt(cwd);
  return formatReflectFollowup(prompt);
}
