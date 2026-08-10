#!/usr/bin/env node
/**
 * Stdio MCP entrypoint for hosts (Cursor, Claude Desktop, etc.).
 *
 * Prefer: `npx knowcards mcp`
 *
 * Example mcp.json:
 * {
 *   "mcpServers": {
 *     "knowledge-cards": {
 *       "command": "npx",
 *       "args": ["knowcards", "mcp"]
 *     }
 *   }
 * }
 */

import { pathToFileURL } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createKnowledgeCardsServer } from "./server.ts";

export async function startMcpStdio(): Promise<void> {
  const server = createKnowledgeCardsServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  await startMcpStdio();
}
