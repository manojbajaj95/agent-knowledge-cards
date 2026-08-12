#!/usr/bin/env node
/**
 * Cursor stop → followup_message with reflection prompt (agent writes cards).
 */
import { onSessionStop } from "../lifecycle/session.ts";
import { parseStdinJson, pickNumber, pickString, writeJson } from "./io.ts";

const payload = parseStdinJson<Record<string, unknown>>();
const status = pickString(payload, ["status"]) ?? "completed";
const loopCount = pickNumber(payload, ["loop_count"]) ?? 0;

if (status !== "completed" || loopCount > 0) {
  writeJson({});
  process.exit(0);
}

const followup = await onSessionStop(undefined, { cwd: process.cwd() });
writeJson({ followup_message: followup });
