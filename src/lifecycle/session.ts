/**
 * Session lifecycle helpers for coding agents (inject on prompt, reflect on stop).
 * Host adapters wrap these strings into Claude Code / Cursor / Codex envelopes.
 */

import { formatCardsForInject } from "../core/inject.ts";
import {
  formatReflectFollowup,
  loadReflectPrompt,
} from "../core/reflection.ts";
import { queryLibrary } from "../core/retrieval.ts";
import { openLibrary } from "../core/storage.ts";
import { allCards, DEFAULT_CARDS_ROOT } from "../core/types/index.ts";

export type SessionPromptOptions = {
  /** Cards root (default `.agents/knowledge_cards`). */
  root?: string;
  /** Project cwd for path resolution (unused today; reserved). */
  cwd?: string;
};

export type SessionStopOptions = {
  /** Project cwd — used to load `REFLECT.md` override. */
  cwd?: string;
  root?: string;
};

/**
 * First-prompt inject: retrieve cards for the user message and format trusted memory.
 * Empty / whitespace query yields an empty inject block (does not dump all cards).
 */
export async function onSessionPrompt(
  userText: string,
  options: SessionPromptOptions = {},
): Promise<string> {
  const root = options.root ?? DEFAULT_CARDS_ROOT;
  const q = userText.trim();
  if (!q) {
    return formatCardsForInject([]);
  }
  const { library } = await openLibrary(root);
  const cards = queryLibrary(library, q);
  return formatCardsForInject(cards);
}

/**
 * @deprecated Prefer {@link onSessionPrompt} with the first user message.
 * Loads the full library (no query filter) for legacy callers.
 */
export async function onSessionStart(
  root: string = DEFAULT_CARDS_ROOT,
): Promise<string> {
  const { library } = await openLibrary(root);
  return formatCardsForInject(allCards(library));
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
