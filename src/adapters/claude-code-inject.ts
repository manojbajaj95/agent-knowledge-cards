#!/usr/bin/env node
/**
 * Claude Code UserPromptSubmit → additionalContext inject.
 */
import { runAdditiveInject } from "./run.ts";

await runAdditiveInject((inject) => ({
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: inject,
  },
}));
