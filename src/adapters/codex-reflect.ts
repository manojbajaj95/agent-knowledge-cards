#!/usr/bin/env node
/**
 * Codex Stop → decision block + reason (continuation prompt; agent writes cards).
 */
import { runReflect } from "./run.ts";

await runReflect((followup) => ({
  decision: "block",
  reason: followup,
}));
