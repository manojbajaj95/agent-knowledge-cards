#!/usr/bin/env node
/**
 * Cursor beforeSubmitPrompt: cannot inject via hook output.
 * Writes `.cursor/rules/knowcards-context.mdc` (alwaysApply) instead.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { onSessionPrompt } from "../lifecycle/session.ts";
import { parseStdinJson, pickString, writeJson } from "./io.ts";

const CURSOR_RULE_REL = join(".cursor", "rules", "knowcards-context.mdc");

const payload = parseStdinJson<Record<string, unknown>>();
const prompt =
  pickString(payload, ["prompt", "user_prompt", "content", "message"]) ?? "";
const cwd = process.cwd();

const inject = await onSessionPrompt(prompt);
const body = [
  "---",
  "description: Knowcards trusted memory (auto-injected; do not edit by hand)",
  "alwaysApply: true",
  "---",
  "",
  inject,
  "",
].join("\n");

const outPath = join(cwd, CURSOR_RULE_REL);
await mkdir(join(cwd, ".cursor", "rules"), { recursive: true });
await writeFile(outPath, body, "utf8");

// beforeSubmitPrompt only supports continue / user_message
writeJson({ continue: true });
