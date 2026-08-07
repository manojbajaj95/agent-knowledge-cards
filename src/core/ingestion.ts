import type { KnowledgeCard, Notebook } from "./types.ts";

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Append a proposed card to the notebook (immutable).
 * Does not persist — caller should saveNotebook.
 */
export function proposeCard(notebook: Notebook, body: string): Notebook {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Card body must be non-empty");
  }
  const card: KnowledgeCard = {
    id: newId(),
    body: trimmed,
    updatedAt: new Date().toISOString(),
  };
  return { cards: [...notebook.cards, card] };
}
