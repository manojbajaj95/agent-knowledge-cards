/**
 * MCP server for knowledge cards (official @modelcontextprotocol/sdk).
 * Core stays free of the MCP SDK; this module is the host edge.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolInit, toolPropose, toolQuery, toolStatus } from "./tools.ts";

export function createKnowledgeCardsServer(): McpServer {
  const server = new McpServer({
    name: "agent-knowledge-cards",
    version: "0.0.1",
  });

  server.registerTool(
    "init",
    {
      title: "Init knowledge cards",
      description: "Create cards root and default notebook directory",
      inputSchema: {
        root: z
          .string()
          .optional()
          .describe("Cards root directory (default: .agents/knowledge_cards)"),
      },
    },
    async (args) => toolInit(args),
  );

  server.registerTool(
    "status",
    {
      title: "Knowledge cards status",
      description: "Return cards root, notebooks, and card counts",
      inputSchema: {
        root: z.string().optional().describe("Cards root directory"),
      },
    },
    async (args) => toolStatus(args),
  );

  server.registerTool(
    "query",
    {
      title: "Query knowledge cards",
      description: "Query knowledge cards with FTS5 BM25 + RRF (empty q = all)",
      inputSchema: {
        q: z.string().optional().describe("Search query"),
        root: z.string().optional().describe("Cards root directory"),
        notebook: z.string().optional().describe("Limit to one notebook id"),
      },
    },
    async (args) => toolQuery(args),
  );

  server.registerTool(
    "propose",
    {
      title: "Propose knowledge card",
      description:
        "Propose a knowledge card (title required; filename slugified from title)",
      inputSchema: {
        title: z.string().describe("Card title (required)"),
        body: z.string().optional().describe("Card body (defaults to title)"),
        useWhen: z.string().optional().describe("Optional use-when hint"),
        notebook: z
          .string()
          .optional()
          .describe("Notebook id (default: default)"),
        root: z.string().optional().describe("Cards root directory"),
      },
    },
    async (args) => toolPropose(args),
  );

  return server;
}

/** Tool names registered on the MCP server. */
export function listTools(): string[] {
  return ["init", "status", "query", "propose"];
}
