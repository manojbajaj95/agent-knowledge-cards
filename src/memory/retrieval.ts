import { rankCardIds } from "./fts.ts";
import type {
  KnowledgeCard,
  KnowledgeLibrary,
  Notebook,
} from "./types/index.ts";
import { allCards } from "./types/index.ts";

/**
 * Retrieve cards with MiniSearch (BM25+) over the in-memory library.
 * Empty query returns all cards (stable id order).
 *
 * Persistence remains filesystem-first; the search index is built per query.
 *
 * Inject caps hits in onSessionPrompt (INJECT_CARD_CAP). CLI query is uncapped.
 * MiniSearch drops query stopwords and uses prefix only on short queries.
 * TODO: progressive disclosure (see roadmap L1-H4)
 * TODO: tune boosts / reuse index across queries
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

  const ids = rankCardIds(cards, q);
  if (ids.length === 0) return [];

  const byId = new Map(cards.map((c) => [c.id, c]));
  const out: KnowledgeCard[] = [];
  for (const id of ids) {
    const card = byId.get(id);
    if (card) out.push(card);
  }
  return out;
}
