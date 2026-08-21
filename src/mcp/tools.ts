import {
  deleteCardOp,
  initCards,
  proposeCardOp,
  queryCardsOp,
  statusCards,
  updateCardOp,
} from "../memory/ops.ts";

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
  try {
    return ok(await initCards(args.root));
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

/** Status: notebooks and card counts (loads library into memory). */
export async function toolStatus(args: {
  root?: string;
}): Promise<ToolTextResult> {
  try {
    return ok(await statusCards(args.root));
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

/** Query cards with MiniSearch BM25+ (empty q = all). */
export async function toolQuery(args: {
  q?: string;
  root?: string;
  notebook?: string;
}): Promise<ToolTextResult> {
  try {
    const cards = await queryCardsOp(args.q ?? "", {
      root: args.root,
      notebook: args.notebook,
    });
    return ok(cards);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

/** Propose a card (title required; writes markdown under the notebook). */
export async function toolPropose(args: {
  title: string;
  body?: string;
  useWhen?: string;
  notebook?: string;
  root?: string;
}): Promise<ToolTextResult> {
  try {
    const card = await proposeCardOp({
      title: args.title,
      body: args.body,
      useWhen: args.useWhen,
      notebook: args.notebook,
      root: args.root,
    });
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
  try {
    const card = await updateCardOp(args.idOrSlug, {
      title: args.title,
      body: args.body,
      useWhen: args.useWhen,
      notebook: args.notebook,
      root: args.root,
    });
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
  try {
    return ok(
      await deleteCardOp(args.idOrSlug, {
        notebook: args.notebook,
        root: args.root,
      }),
    );
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
