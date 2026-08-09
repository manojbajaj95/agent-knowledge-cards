import matter from "gray-matter";
import type { KnowledgeCard } from "./types/knowledge-card.ts";

/**
 * Serialize a card to markdown with YAML frontmatter (gray-matter).
 * Slug is the filename, not duplicated in frontmatter.
 */
export function serializeCardMarkdown(card: KnowledgeCard): string {
  const data: Record<string, string> = {
    id: card.id,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    title: card.title,
  };
  if (card.useWhen) data.useWhen = card.useWhen;
  return matter.stringify(card.body.trimEnd(), data);
}

/**
 * Parse a card markdown file. `slug` comes from the filename (no extension).
 */
export function parseCardMarkdown(slug: string, raw: string): KnowledgeCard {
  if (!matter.test(raw)) {
    throw new Error(`Card "${slug}" is missing frontmatter`);
  }
  const { data, content } = matter(raw);
  const id = asString(data.id);
  const createdAt = asString(data.createdAt);
  const updatedAt = asString(data.updatedAt);
  const title = asString(data.title);
  if (!id || !createdAt || !updatedAt || !title) {
    throw new Error(
      `Card "${slug}" frontmatter requires id, createdAt, updatedAt, title`,
    );
  }

  const card: KnowledgeCard = {
    id,
    title,
    slug,
    createdAt,
    updatedAt,
    body: content.trim(),
  };
  const useWhen = asString(data.useWhen);
  if (useWhen) card.useWhen = useWhen;
  return card;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return undefined;
}
