import { slugify } from "./slug.ts";
import type { KnowledgeCard, Notebook } from "./types/index.ts";

export type ProposeCardInput = {
  /** Required human title; also used to derive the filename slug. */
  title: string;
  /** Card details; defaults to title when omitted. */
  body?: string;
  useWhen?: string;
};

export type ProposeCardResult = {
  notebook: Notebook;
  card: KnowledgeCard;
};

/**
 * Append a proposed card to the notebook (immutable).
 * Requires title; slugifies it for the on-disk filename.
 * Does not persist — caller should storage.writeCard.
 *
 * TODO: full CRUD when a card is stale or needs edits
 * TODO: confirm, upvote, reject
 */
export function proposeCard(
  notebook: Notebook,
  input: ProposeCardInput,
): ProposeCardResult {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Card title must be non-empty");
  }
  const body = (input.body ?? title).trim();
  if (!body) {
    throw new Error("Card body must be non-empty");
  }

  const slug = slugify(title);
  if (notebook.cards.some((c) => c.slug === slug)) {
    throw new Error(
      `Card slug "${slug}" already exists in notebook "${notebook.id}"`,
    );
  }

  const now = new Date().toISOString();
  const card: KnowledgeCard = {
    id: crypto.randomUUID(),
    title,
    slug,
    createdAt: now,
    updatedAt: now,
    body,
  };
  if (input.useWhen?.trim()) {
    card.useWhen = input.useWhen.trim();
  }

  return {
    notebook: { ...notebook, cards: [...notebook.cards, card] },
    card,
  };
}
