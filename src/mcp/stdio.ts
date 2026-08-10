#!/usr/bin/env node
/**
 * Stdio MCP entrypoint for hosts (Cursor, Claude Desktop, etc.).
 *
 * Example Cursor mcp.json:
 * {
 *   "mcpServers": {
 *     "knowledge-cards": {
 *       "command": "bun",
 *       "args": ["run", "src/mcp/stdio.ts"]
 *     }
 *   }
 * }
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createKnowledgeCardsServer } from "./server.ts";

const server = createKnowledgeCardsServer();
const transport = new StdioServerTransport();
await server.connect(transport);
