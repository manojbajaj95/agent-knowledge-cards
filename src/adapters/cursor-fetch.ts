#!/usr/bin/env node
/**
 * Cursor beforeSubmitPrompt: cannot inject via hook output.
 * Writes `.cursor/rules/knowcards-context.mdc` (alwaysApply) instead.
 */
import { runCursorInject } from "./run.ts";

await runCursorInject();
