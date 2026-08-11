import type { KnowledgeCard } from "./knowledge-card.ts";

/** Notebook id; default notebook dirs are created on propose (init parked). */
export const DEFAULT_NOTEBOOK_ID = "default";

/** A domain notebook: subdirectory under the cards root. */
export type Notebook = {
  /** Domain id / directory name (e.g. `default`). */
  id: string;
  cards: KnowledgeCard[];
};

export function emptyNotebook(id: string = DEFAULT_NOTEBOOK_ID): Notebook {
  return { id, cards: [] };
}
