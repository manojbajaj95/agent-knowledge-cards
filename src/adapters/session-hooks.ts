/**
 * Session hook stubs for coding harnesses (e.g. Cursor).
 *
 * TODO: Cursor SessionStart inject / Stop reflect wiring
 */

import { formatCardsForInject } from "./custom-harness.ts";
import { reflect } from "../core/reflection.ts";
import { queryCards } from "../core/retrieval.ts";
import { loadNotebook, saveNotebook } from "../core/storage.ts";
import { DEFAULT_NOTEBOOK_PATH } from "../core/types.ts";

/** SessionStart-style: load notebook and return inject text. */
export async function onSessionStart(
  path: string = DEFAULT_NOTEBOOK_PATH,
): Promise<string> {
  const nb = await loadNotebook(path);
  const cards = queryCards(nb, "");
  return formatCardsForInject(cards);
}

/** Stop-style: stub-reflect episode text into the notebook. */
export async function onSessionStop(
  episodeText: string,
  path: string = DEFAULT_NOTEBOOK_PATH,
): Promise<void> {
  const nb = await loadNotebook(path);
  const next = reflect(nb, { text: episodeText });
  await saveNotebook(next, path);
}
