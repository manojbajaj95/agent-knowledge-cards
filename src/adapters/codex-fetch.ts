#!/usr/bin/env node
/**
 * Codex UserPromptSubmit → additionalContext inject.
 */
import { runAdditiveInject } from "./run.ts";

await runAdditiveInject((inject) => ({
  suppressOutput: true,
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: inject,
  },
}));
