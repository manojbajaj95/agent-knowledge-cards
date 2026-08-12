#!/usr/bin/env node
/**
 * Claude Code UserPromptSubmit → additionalContext inject.
 */
import { onSessionPrompt } from "../lifecycle/session.ts";
import { parseStdinJson, pickString, writeJson } from "./io.ts";

const payload = parseStdinJson<Record<string, unknown>>();
const prompt =
  pickString(payload, ["prompt", "user_prompt", "content", "message"]) ?? "";

const inject = await onSessionPrompt(prompt);
writeJson({
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: inject,
  },
});
