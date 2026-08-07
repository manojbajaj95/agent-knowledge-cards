/**
 * MCP tool handlers for knowledge cards.
 *
 * TODO: wire a real MCP stdio server (@modelcontextprotocol/sdk).
 * For now these handlers call core so hosts can integrate manually.
 */

import { proposeCard } from "../core/ingestion.ts";
import { queryCards } from "../core/retrieval.ts";
import { loadNotebook, saveNotebook } from "../core/storage.ts";
import { DEFAULT_NOTEBOOK_PATH, type Notebook } from "../core/types.ts";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
};

async function withNotebook(
  path: string,
  fn: (nb: Notebook) => Notebook | Promise<Notebook> | void,
): Promise<Notebook> {
  const nb = await loadNotebook(path);
  const next = await fn(nb);
  if (next) {
    await saveNotebook(next, path);
    return next;
  }
  return nb;
}

export const tools = {
  status: {
    description: "Return notebook path and card count",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Notebook JSON path" },
      },
    },
    async handler(args: { path?: string }): Promise<ToolResult> {
      const path = args.path ?? DEFAULT_NOTEBOOK_PATH;
      const nb = await loadNotebook(path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ path, count: nb.cards.length }),
          },
        ],
      };
    },
  },

  query: {
    description: "Query knowledge cards by substring (empty = all)",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        path: { type: "string" },
      },
    },
    async handler(args: { q?: string; path?: string }): Promise<ToolResult> {
      const path = args.path ?? DEFAULT_NOTEBOOK_PATH;
      const nb = await loadNotebook(path);
      const cards = queryCards(nb, args.q ?? "");
      return {
        content: [{ type: "text", text: JSON.stringify(cards, null, 2) }],
      };
    },
  },

  propose: {
    description: "Append a knowledge card to the notebook",
    inputSchema: {
      type: "object",
      properties: {
        body: { type: "string" },
        path: { type: "string" },
      },
      required: ["body"],
    },
    async handler(args: { body: string; path?: string }): Promise<ToolResult> {
      const path = args.path ?? DEFAULT_NOTEBOOK_PATH;
      const next = await withNotebook(path, (nb) => proposeCard(nb, args.body));
      const added = next.cards[next.cards.length - 1];
      return {
        content: [{ type: "text", text: JSON.stringify(added, null, 2) }],
      };
    },
  },
} as const;

/** List tool names for discovery. */
export function listTools(): string[] {
  return Object.keys(tools);
}
