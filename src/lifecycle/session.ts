/**
 * Session lifecycle hooks for coding agents (e.g. Cursor SessionStart / Stop).
 *
 * TODO: wire real Cursor session hooks
 */

import { formatCardsForInject } from "../core/inject.ts";
import { openLibrary } from "../core/storage.ts";
import { DEFAULT_CARDS_ROOT, allCards } from "../core/types/index.ts";

/** SessionStart-style: load all notebooks into memory and return inject text. */
export async function onSessionStart(
  root: string = DEFAULT_CARDS_ROOT,
): Promise<string> {
  const { library } = await openLibrary(root);
  return formatCardsForInject(allCards(library));
}

/**
 * Stop-style: reflect episode into notebooks.
 * TODO: wire reflection once implemented
 */
export async function onSessionStop(
  _episodeText: string,
  _root: string = DEFAULT_CARDS_ROOT,
): Promise<void> {
  throw new Error(
    "onSessionStop reflection is not implemented yet — see src/core/reflection.ts",
  );
}
