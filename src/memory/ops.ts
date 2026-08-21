/**
 * Persist ops: open library, mutate, write. CLI and MCP call these.
 */
import {
  deleteCard as deleteCardInMemory,
  type ProposeCardInput,
  proposeCard as proposeCardInMemory,
  type UpdateCardInput,
  updateCard as updateCardInMemory,
} from "./ingestion.ts";
import { queryLibrary } from "./retrieval.ts";
import { FsCardStorage, openLibrary, requireNotebook } from "./storage.ts";
import {
  allCards,
  DEFAULT_CARDS_ROOT,
  DEFAULT_NOTEBOOK_ID,
  type KnowledgeCard,
} from "./types/index.ts";

export type StatusResult = {
  root: string;
  notebooks: Array<{ id: string; count: number }>;
  totalCards: number;
};

export type InitResult = {
  root: string;
  notebook: string;
  initialized: true;
};

/** Create cards root and default notebook directory. */
export async function initCards(
  root: string = DEFAULT_CARDS_ROOT,
): Promise<InitResult> {
  const storage = new FsCardStorage(root);
  await storage.init();
  return { root, notebook: DEFAULT_NOTEBOOK_ID, initialized: true };
}

/** Status: notebooks and card counts. */
export async function statusCards(
  root: string = DEFAULT_CARDS_ROOT,
): Promise<StatusResult> {
  const { library } = await openLibrary(root);
  return {
    root: library.root,
    notebooks: library.notebooks.map((n) => ({
      id: n.id,
      count: n.cards.length,
    })),
    totalCards: allCards(library).length,
  };
}

/** Query cards (empty q = all). */
export async function queryCardsOp(
  q: string = "",
  opts: { root?: string; notebook?: string } = {},
): Promise<KnowledgeCard[]> {
  const { library } = await openLibrary(opts.root ?? DEFAULT_CARDS_ROOT);
  return queryLibrary(library, q, opts.notebook);
}

/** Propose a card and persist it. */
export async function proposeCardOp(
  input: ProposeCardInput & { notebook?: string; root?: string },
): Promise<KnowledgeCard> {
  const root = input.root ?? DEFAULT_CARDS_ROOT;
  const notebookId = input.notebook ?? DEFAULT_NOTEBOOK_ID;
  const { storage, library } = await openLibrary(root);
  const nb = requireNotebook(library, notebookId);
  const { card } = proposeCardInMemory(nb, {
    title: input.title,
    body: input.body,
    useWhen: input.useWhen,
  });
  await storage.writeCard(notebookId, card);
  return card;
}

/** Update a card and persist (renames file when slug changes). */
export async function updateCardOp(
  idOrSlug: string,
  patch: UpdateCardInput & { notebook?: string; root?: string },
): Promise<KnowledgeCard> {
  const root = patch.root ?? DEFAULT_CARDS_ROOT;
  const notebookId = patch.notebook ?? DEFAULT_NOTEBOOK_ID;
  const { storage, library } = await openLibrary(root);
  const nb = requireNotebook(library, notebookId);
  const { card, previousSlug } = updateCardInMemory(nb, idOrSlug, {
    title: patch.title,
    body: patch.body,
    useWhen: patch.useWhen,
  });
  await storage.writeCard(notebookId, card);
  if (previousSlug !== card.slug) {
    await storage.deleteCard(notebookId, previousSlug);
  }
  return card;
}

/** Delete a card and unlink its file. */
export async function deleteCardOp(
  idOrSlug: string,
  opts: { notebook?: string; root?: string } = {},
): Promise<{ deleted: true; card: KnowledgeCard }> {
  const root = opts.root ?? DEFAULT_CARDS_ROOT;
  const notebookId = opts.notebook ?? DEFAULT_NOTEBOOK_ID;
  const { storage, library } = await openLibrary(root);
  const nb = requireNotebook(library, notebookId);
  const { card } = deleteCardInMemory(nb, idOrSlug);
  await storage.deleteCard(notebookId, card.slug);
  return { deleted: true, card };
}
