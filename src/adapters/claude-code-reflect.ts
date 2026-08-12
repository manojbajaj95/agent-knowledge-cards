#!/usr/bin/env node
/**
 * Claude Code Stop → asyncRewake (exit 2 + stderr) so reflect continues
 * the same idle session (KV cache) after the user-facing turn ends.
 */
import { runClaudeCodeReflectRewake } from "./run.ts";

await runClaudeCodeReflectRewake();
