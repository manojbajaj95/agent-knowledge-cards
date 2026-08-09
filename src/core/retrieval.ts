import { bm25RankedLists } from "./fts.ts";
import { reciprocalRankFusion } from "./rrf.ts";
import type { KnowledgeCard, KnowledgeLibrary, Notebook } from "./types/index.ts";
import { allCards } from "./types/index.ts";

/**
 * Retrieve cards with in-memory SQLite FTS5 BM25, fused via RRF across
 * title-heavy, body-heavy, and slug/useWhen-heavy rankings.
 * Empty query returns all cards (stable id order).
 *
 * Persistence remains filesystem-first; FTS is built from the in-memory library.
 *
 * TODO: budgeted retrieval (count/char caps)
 * TODO: progressive disclosure (see roadmap L1-H4)
 */
export function queryCards(notebook: Notebook, query: string): KnowledgeCard[] {
  return rankCards(notebook.cards, query);
}

/** Query across the in-memory library (optionally one notebook). */
export function queryLibrary(
  library: KnowledgeLibrary,
  query: string,
  notebookId?: string,
): KnowledgeCard[] {
  const cards = notebookId
    ? (library.notebooks.find((n) => n.id === notebookId)?.cards ?? [])
    : allCards(library);
  return rankCards(cards, query);
}

export function getCard(
  notebook: Notebook,
  idOrSlug: string,
): KnowledgeCard | undefined {
  return notebook.cards.find(
    (card) => card.id === idOrSlug || card.slug === idOrSlug,
  );
}

function rankCards(cards: KnowledgeCard[], query: string): KnowledgeCard[] {
  const q = query.trim();
  if (!q) return [...cards];

  const lists = bm25RankedLists(cards, q);
  const fusedIds = reciprocalRankFusion(lists);
  if (fusedIds.length === 0) return [];

  const byId = new Map(cards.map((c) => [c.id, c]));
  const out: KnowledgeCard[] = [];
  for (const id of fusedIds) {
    const card = byId.get(id);
    if (card) out.push(card);
  }
  return out;
}
