/** A single durable knowledge card. */
export type KnowledgeCard = {
  id: string;
  /** Free text; optional "Use when:" line by convention. */
  body: string;
  updatedAt: string;
};

/** Full notebook of cards (the unit of persistence). */
export type Notebook = {
  cards: KnowledgeCard[];
};

/** Opaque episode for reflection (transcript / feedback blob). */
export type Episode = {
  text: string;
};

export const DEFAULT_NOTEBOOK_PATH = ".knowledge-cards/notebook.json";

export function emptyNotebook(): Notebook {
  return { cards: [] };
}
