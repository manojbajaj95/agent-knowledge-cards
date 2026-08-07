import { proposeCard } from "./ingestion.ts";
import type { Episode, Notebook } from "./types.ts";

const STUB_SNIPPET_CHARS = 200;

/**
 * Deterministic stub reflection (no LLM).
 * If the episode is non-empty, appends one card from the first ~200 chars.
 *
 * TODO: real LLM full-notebook rebuild (CL bench KnowledgeCardNotebook)
 * TODO: task-tuned reflection prompts
 * TODO: drift / STALE card handling
 * TODO: confirm/flag feedback on cards
 */
export function reflect(notebook: Notebook, episode: Episode): Notebook {
  const text = episode.text.trim();
  if (!text) return notebook;

  const snippet =
    text.length > STUB_SNIPPET_CHARS
      ? `${text.slice(0, STUB_SNIPPET_CHARS)}…`
      : text;
  const body = `Use when: reviewing a prior episode\n${snippet}`;
  return proposeCard(notebook, body);
}
