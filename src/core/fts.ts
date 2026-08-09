import { Database } from "bun:sqlite";
import type { KnowledgeCard } from "./types/knowledge-card.ts";

/** BM25 weight sets over FTS columns: slug, title, useWhen, body. */
const BM25_WEIGHT_SETS: readonly (readonly number[])[] = [
  // title-heavy
  [1.0, 10.0, 2.0, 1.0],
  // body-heavy
  [1.0, 1.0, 1.0, 10.0],
  // slug + useWhen-heavy
  [8.0, 1.0, 8.0, 1.0],
];

/**
 * Turn free text into a safe FTS5 MATCH query (OR of quoted tokens).
 * Returns null when there are no usable tokens.
 */
export function toFtsQuery(raw: string): string | null {
  const terms = raw
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length < 64);
  if (terms.length === 0) return null;
  return terms.map((t) => `"${t.replaceAll('"', "")}"`).join(" OR ");
}

/**
 * Rank card ids with FTS5 BM25 under several column-weightings.
 * Each weighting produces one ranked list for RRF.
 */
export function bm25RankedLists(cards: KnowledgeCard[], query: string): string[][] {
  const match = toFtsQuery(query);
  if (!match || cards.length === 0) return [];

  const db = new Database(":memory:");
  try {
    db.run(`
      CREATE VIRTUAL TABLE cards_fts USING fts5(
        id UNINDEXED,
        slug,
        title,
        useWhen,
        body,
        tokenize = 'porter unicode61'
      )
    `);

    const insert = db.prepare(
      `INSERT INTO cards_fts (id, slug, title, useWhen, body) VALUES (?, ?, ?, ?, ?)`,
    );
    const tx = db.transaction((rows: KnowledgeCard[]) => {
      for (const card of rows) {
        insert.run(
          card.id,
          card.slug,
          card.title,
          card.useWhen ?? "",
          card.body,
        );
      }
    });
    tx(cards);

    const lists: string[][] = [];
    for (const weights of BM25_WEIGHT_SETS) {
      const [wSlug, wTitle, wWhen, wBody] = weights;
      const sql = `
        SELECT id
        FROM cards_fts
        WHERE cards_fts MATCH ?
        ORDER BY bm25(cards_fts, ${wSlug}, ${wTitle}, ${wWhen}, ${wBody})
      `;
      try {
        const rows = db.prepare(sql).all(match) as Array<{ id: string }>;
        lists.push(rows.map((r) => r.id));
      } catch {
        // Invalid MATCH for this corpus — treat as empty list.
        lists.push([]);
      }
    }
    return lists;
  } finally {
    db.close();
  }
}
