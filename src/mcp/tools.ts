import { deleteCard, proposeCard, updateCard } from "../core/ingestion.ts";
import { queryLibrary } from "../core/retrieval.ts";
import {
  FsCardStorage,
  openLibrary,
  requireNotebook,
} from "../core/storage.ts";
import {
  allCards,
  DEFAULT_CARDS_ROOT,
  DEFAULT_NOTEBOOK_ID,
} from "../core/types/index.ts";

export type ToolTextResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function ok(payload: unknown): ToolTextResult {
  return {
    content: [
      {
        type: "text",
        text:
          typeof payload === "string"
            ? payload
            : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function fail(message: string): ToolTextResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Initialize cards root + default notebook (filesystem). */
export async function toolInit(args: {
  root?: string;
}): Promise<ToolTextResult> {
  const root = args.root ?? DEFAULT_CARDS_ROOT;
  const storage = new FsCardStorage(root);
  await storage.init();
  return ok({ root, notebook: DEFAULT_NOTEBOOK_ID, initialized: true });
}

/** Status: notebooks and card counts (loads library into memory). */
export async function toolStatus(args: {
  root?: string;
}): Promise<ToolTextResult> {
  const { library } = await openLibrary(args.root ?? DEFAULT_CARDS_ROOT);
  return ok({
    root: library.root,
    notebooks: library.notebooks.map((n) => ({
      id: n.id,
      count: n.cards.length,
    })),
    totalCards: allCards(library).length,
  });
}

/** Query cards with MiniSearch BM25+ (empty q = all). */
export async function toolQuery(args: {
  q?: string;
  root?: string;
  notebook?: string;
}): Promise<ToolTextResult> {
  const { library } = await openLibrary(args.root ?? DEFAULT_CARDS_ROOT);
  const cards = queryLibrary(library, args.q ?? "", args.notebook);
  return ok(cards);
}

/** Propose a card (title required; writes markdown under the notebook). */
export async function toolPropose(args: {
  title: string;
  body?: string;
  useWhen?: string;
  notebook?: string;
  root?: string;
}): Promise<ToolTextResult> {
  const root = args.root ?? DEFAULT_CARDS_ROOT;
  const notebookId = args.notebook ?? DEFAULT_NOTEBOOK_ID;
  const { storage, library } = await openLibrary(root);
  // writeCard mkdir -p; no explicit init required
  try {
    const nb = requireNotebook(library, notebookId);
    const { card } = proposeCard(nb, {
      title: args.title,
      body: args.body,
      useWhen: args.useWhen,
    });
    await storage.writeCard(notebookId, card);
    return ok(card);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

/** Update a card by id or slug. */
export async function toolUpdate(args: {
  idOrSlug: string;
  title?: string;
  body?: string;
  useWhen?: string;
  notebook?: string;
  root?: string;
}): Promise<ToolTextResult> {
  const root = args.root ?? DEFAULT_CARDS_ROOT;
  const notebookId = args.notebook ?? DEFAULT_NOTEBOOK_ID;
  const { storage, library } = await openLibrary(root);
  try {
    const nb = requireNotebook(library, notebookId);
    const { card, previousSlug } = updateCard(nb, args.idOrSlug, {
      title: args.title,
      body: args.body,
      useWhen: args.useWhen,
    });
    await storage.writeCard(notebookId, card);
    if (previousSlug !== card.slug) {
      await storage.deleteCard(notebookId, previousSlug);
    }
    return ok(card);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

/** Delete a card by id or slug. */
export async function toolDelete(args: {
  idOrSlug: string;
  notebook?: string;
  root?: string;
}): Promise<ToolTextResult> {
  const root = args.root ?? DEFAULT_CARDS_ROOT;
  const notebookId = args.notebook ?? DEFAULT_NOTEBOOK_ID;
  const { storage, library } = await openLibrary(root);
  try {
    const nb = requireNotebook(library, notebookId);
    const { card } = deleteCard(nb, args.idOrSlug);
    await storage.deleteCard(notebookId, card.slug);
    return ok({ deleted: true, card });
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
