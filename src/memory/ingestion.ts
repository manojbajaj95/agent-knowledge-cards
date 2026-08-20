import { getCard } from "./retrieval.ts";
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

export type UpdateCardInput = {
  title?: string;
  body?: string;
  /** Pass null or "" to clear use-when. Omit to leave it. */
  useWhen?: string | null;
};

export type UpdateCardResult = {
  notebook: Notebook;
  card: KnowledgeCard;
  previousSlug: string;
};

export type DeleteCardResult = {
  notebook: Notebook;
  card: KnowledgeCard;
};

function requireCard(notebook: Notebook, idOrSlug: string): KnowledgeCard {
  const card = getCard(notebook, idOrSlug);
  if (!card) {
    throw new Error(
      `Card "${idOrSlug}" not found in notebook "${notebook.id}"`,
    );
  }
  return card;
}

/**
 * Append a proposed card to the notebook (immutable).
 * Requires title; slugifies it for the on-disk filename.
 * Does not persist — caller should storage.writeCard.
 *
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

/**
 * Patch an existing card (immutable). Does not persist —
 * caller should storage.writeCard, then storage.deleteCard if the slug changed.
 */
export function updateCard(
  notebook: Notebook,
  idOrSlug: string,
  patch: UpdateCardInput,
): UpdateCardResult {
  const existing = requireCard(notebook, idOrSlug);
  if (
    patch.title === undefined &&
    patch.body === undefined &&
    patch.useWhen === undefined
  ) {
    throw new Error("Update requires title, body, and/or use-when");
  }

  const title = patch.title !== undefined ? patch.title.trim() : existing.title;
  if (!title) {
    throw new Error("Card title must be non-empty");
  }
  const body = patch.body !== undefined ? patch.body.trim() : existing.body;
  if (!body) {
    throw new Error("Card body must be non-empty");
  }

  const slug = slugify(title);
  if (
    slug !== existing.slug &&
    notebook.cards.some((c) => c.slug === slug && c.id !== existing.id)
  ) {
    throw new Error(
      `Card slug "${slug}" already exists in notebook "${notebook.id}"`,
    );
  }

  const card: KnowledgeCard = {
    id: existing.id,
    title,
    slug,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    body,
  };
  if (patch.useWhen === undefined) {
    if (existing.useWhen) card.useWhen = existing.useWhen;
  } else if (patch.useWhen?.trim()) {
    card.useWhen = patch.useWhen.trim();
  }

  return {
    notebook: {
      ...notebook,
      cards: notebook.cards.map((c) => (c.id === existing.id ? card : c)),
    },
    card,
    previousSlug: existing.slug,
  };
}

/** Remove a card from the notebook (immutable). Caller should storage.deleteCard. */
export function deleteCard(
  notebook: Notebook,
  idOrSlug: string,
): DeleteCardResult {
  const existing = requireCard(notebook, idOrSlug);
  return {
    notebook: {
      ...notebook,
      cards: notebook.cards.filter((c) => c.id !== existing.id),
    },
    card: existing,
  };
}
