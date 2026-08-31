import MiniSearch from "minisearch";
import type { KnowledgeCard } from "./types/knowledge-card.ts";

/** Field boosts: title-heavy, light body. Tune later via searchOptions. */
const BOOST = { title: 4, useWhen: 2, slug: 2, body: 1 } as const;

/** Prefix match only for short queries. Long prompts OR-match too widely. */
const PREFIX_MAX_TERMS = 3;

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "in",
  "of",
  "for",
  "on",
  "at",
  "is",
  "it",
  "as",
  "be",
  "by",
  "this",
  "that",
  "with",
  "from",
  "can",
  "we",
  "you",
  "what",
  "how",
  "do",
  "does",
  "please",
  "just",
  "also",
  "about",
  "into",
  "if",
  "not",
  "are",
  "was",
  "will",
  "would",
  "lets",
  "let",
]);

function processQueryTerm(term: string): string | null {
  const t = term.toLowerCase();
  return STOP.has(t) ? null : t;
}

/**
 * Rank card ids with MiniSearch (BM25+). Rebuilds a tiny in-memory index
 * per call — fine while libraries stay small.
 */
export function rankCardIds(cards: KnowledgeCard[], query: string): string[] {
  if (cards.length === 0) return [];

  const mini = new MiniSearch({
    fields: ["slug", "title", "useWhen", "body"],
    idField: "id",
    searchOptions: {
      boost: { ...BOOST },
      prefix: (_term, _i, tokens) => tokens.length <= PREFIX_MAX_TERMS,
      processTerm: processQueryTerm,
    },
  });

  mini.addAll(
    cards.map((card) => ({
      id: card.id,
      slug: card.slug,
      title: card.title,
      useWhen: card.useWhen ?? "",
      body: card.body,
    })),
  );

  return mini.search(query).map((hit) => String(hit.id));
}
