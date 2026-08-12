#!/usr/bin/env node
/**
 * Claude Code Stop → additionalContext reflect follow-up (agent writes cards).
 */
import { runReflect } from "./run.ts";

await runReflect((followup) => ({
  hookSpecificOutput: {
    hookEventName: "Stop",
    additionalContext: followup,
  },
}));
