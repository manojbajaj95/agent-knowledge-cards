import type { KnowledgeCard, Notebook } from "./types.ts";

/**
 * Case-insensitive substring match on card body.
 * Empty query returns all cards.
 *
 * TODO: budgeted retrieval (count/char caps)
 * TODO: SQLite FTS / progressive disclosure
 */
export function queryCards(notebook: Notebook, query: string): KnowledgeCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...notebook.cards];
  return notebook.cards.filter((card) => card.body.toLowerCase().includes(q));
}

export function getCard(
  notebook: Notebook,
  id: string,
): KnowledgeCard | undefined {
  return notebook.cards.find((card) => card.id === id);
}
