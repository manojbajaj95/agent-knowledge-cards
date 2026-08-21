#!/usr/bin/env node
/**
 * Codex UserPromptSubmit → additionalContext fetch.
 */
import { runAdditiveFetch } from "./run.ts";

await runAdditiveFetch((text) => ({
  suppressOutput: true,
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: text,
  },
}));
