import type { KnowledgeCard } from "./knowledge-card.ts";
import { DEFAULT_NOTEBOOK_ID, type Notebook } from "./notebook.ts";

export type { KnowledgeCard } from "./knowledge-card.ts";
export {
  DEFAULT_NOTEBOOK_ID,
  emptyNotebook,
  type Notebook,
} from "./notebook.ts";

/**
 * In-memory snapshot of all notebooks + cards for a process.
 * Built at start via storage.loadAll(); mutated in memory then persisted.
 */
export type KnowledgeLibrary = {
  root: string;
  notebooks: Notebook[];
};

/** Opaque episode for future reflection (transcript / feedback blob). */
export type Episode = {
  text: string;
};

/** Default on-disk root: one dir per notebook (domain). */
export const DEFAULT_CARDS_ROOT = ".agents/knowledge_cards";

export function emptyLibrary(root: string = DEFAULT_CARDS_ROOT): KnowledgeLibrary {
  return { root, notebooks: [] };
}

export function getNotebook(
  library: KnowledgeLibrary,
  notebookId: string = DEFAULT_NOTEBOOK_ID,
): Notebook | undefined {
  return library.notebooks.find((n) => n.id === notebookId);
}

export function allCards(library: KnowledgeLibrary): KnowledgeCard[] {
  return library.notebooks.flatMap((n) => n.cards);
}

/**
 * Replace or append a notebook in the in-memory library (immutable).
 */
export function withNotebook(
  library: KnowledgeLibrary,
  notebook: Notebook,
): KnowledgeLibrary {
  const idx = library.notebooks.findIndex((n) => n.id === notebook.id);
  if (idx === -1) {
    return { ...library, notebooks: [...library.notebooks, notebook] };
  }
  const notebooks = library.notebooks.slice();
  notebooks[idx] = notebook;
  return { ...library, notebooks };
}
