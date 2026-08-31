#!/usr/bin/env node
/**
 * Claude Code UserPromptSubmit → additionalContext fetch.
 */
import { runAdditiveFetch } from "./run.ts";

await runAdditiveFetch((text) => ({
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: text,
  },
}));
