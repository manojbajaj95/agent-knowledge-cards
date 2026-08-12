#!/usr/bin/env node
/**
 * Claude Code Stop → additionalContext reflect follow-up (agent writes cards).
 */
import { onSessionStop } from "../lifecycle/session.ts";
import { parseStdinJson, pickBool, pickString, writeJson } from "./io.ts";

const payload = parseStdinJson<Record<string, unknown>>();
const stopHookActive = pickBool(payload, ["stop_hook_active"]) ?? false;

if (stopHookActive) {
  writeJson({});
  process.exit(0);
}

const cwd = pickString(payload, ["cwd"]) ?? process.cwd();
const followup = await onSessionStop(undefined, { cwd });
writeJson({
  hookSpecificOutput: {
    hookEventName: "Stop",
    additionalContext: followup,
  },
});
