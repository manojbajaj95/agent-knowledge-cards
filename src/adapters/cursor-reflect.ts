#!/usr/bin/env node
/**
 * Cursor stop → followup_message with reflection prompt (agent writes cards).
 */
import { runReflect } from "./run.ts";

await runReflect((followup) => ({ followup_message: followup }));
