import MiniSearch from "minisearch";
import type { KnowledgeCard } from "./types/knowledge-card.ts";

/** Field boosts: title-heavy, light body. Tune later via searchOptions. */
const BOOST = { title: 4, useWhen: 2, slug: 2, body: 1 } as const;

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
      prefix: true,
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
