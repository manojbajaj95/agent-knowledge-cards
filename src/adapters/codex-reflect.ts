#!/usr/bin/env node
/**
 * Codex Stop → decision block + reason (continuation prompt; agent writes cards).
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
  decision: "block",
  reason: followup,
});
