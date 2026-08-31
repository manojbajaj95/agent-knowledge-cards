#!/usr/bin/env node
/**
 * Cursor beforeSubmitPrompt: cannot fetch via hook output.
 * Writes `.cursor/rules/knowcards-context.mdc` (alwaysApply) instead.
 */
import { runCursorFetch } from "./run.ts";

await runCursorFetch();
