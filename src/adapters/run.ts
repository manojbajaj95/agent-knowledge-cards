/**
 * Shared inject/reflect runners. Host adapters only supply the envelope.
 */
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type HookState,
  loadHookState,
  saveHookState,
} from "../lifecycle/hook-state.ts";
import { onSessionPrompt, onSessionStop } from "../lifecycle/session.ts";
import {
  parseStdinJson,
  pickBool,
  pickNumber,
  pickString,
  withFailOpen,
  writeJson,
} from "./io.ts";

const CURSOR_RULE_REL = join(".cursor", "rules", "knowcards-context.mdc");

const MUTATION_RE = /\b(Write|Edit|StrReplace|NotebookEdit|Delete|TabWrite)\b/;

function skipSlugsForSession(
  sessionId: string,
  state: HookState | null,
): string[] {
  if (sessionId && state?.sessionId === sessionId) return state.injectedSlugs;
  return [];
}

/** Skip reflect when the host already looped, or the transcript has no file edits. */
export function shouldSkipReflect(payload: Record<string, unknown>): boolean {
  if (pickBool(payload, ["stop_hook_active"])) return true;
  const status = pickString(payload, ["status"]);
  if (status && status !== "completed") return true;
  if ((pickNumber(payload, ["loop_count"]) ?? 0) > 0) return true;
  const transcript = pickString(payload, ["transcript_path", "transcriptPath"]);
  if (!transcript) return false;
  try {
    return !MUTATION_RE.test(readFileSync(transcript, "utf8"));
  } catch {
    return false;
  }
}

export async function runAdditiveInject(
  envelope: (inject: string) => unknown,
): Promise<void> {
  await withFailOpen(async () => {
    const payload = parseStdinJson<Record<string, unknown>>();
    const prompt =
      pickString(payload, ["prompt", "user_prompt", "content", "message"]) ??
      "";
    const sessionId =
      pickString(payload, ["session_id", "conversation_id"]) ?? "";
    const state = await loadHookState();
    const skipSlugs = skipSlugsForSession(sessionId, state);
    const inject = await onSessionPrompt(prompt, { skipSlugs });
    if (!inject.text) {
      writeJson({});
      return;
    }
    if (!sessionId && state?.lastInject === inject.text) {
      writeJson({});
      return;
    }
    await saveHookState({
      sessionId: sessionId || state?.sessionId,
      injectedSlugs: [...new Set([...skipSlugs, ...inject.slugs])],
      lastInject: inject.text,
    });
    writeJson(envelope(inject.text));
  });
}

export async function runCursorInject(): Promise<void> {
  await withFailOpen(async () => {
    const payload = parseStdinJson<Record<string, unknown>>();
    const prompt =
      pickString(payload, ["prompt", "user_prompt", "content", "message"]) ??
      "";
    const words = prompt.trim().split(/\s+/).filter(Boolean);
    if (words.length < 3) {
      writeJson({ continue: true });
      return;
    }
    const inject = await onSessionPrompt(prompt);
    if (!inject.text) {
      writeJson({ continue: true });
      return;
    }
    const body = [
      "---",
      "description: Knowcards trusted memory (auto-injected; do not edit by hand)",
      "alwaysApply: true",
      "---",
      "",
      inject.text,
      "",
    ].join("\n");
    const outPath = join(process.cwd(), CURSOR_RULE_REL);
    try {
      if ((await readFile(outPath, "utf8")) === body) {
        writeJson({ continue: true });
        return;
      }
    } catch {
      // missing file — write
    }
    await mkdir(join(process.cwd(), ".cursor", "rules"), { recursive: true });
    await writeFile(outPath, body, "utf8");
    writeJson({ continue: true });
  });
}

/** Null when Stop should not continue (already looped, no file edits, empty prompt). */
export async function reflectFollowupFromPayload(
  payload: Record<string, unknown>,
): Promise<string | null> {
  if (shouldSkipReflect(payload)) return null;
  const cwd = pickString(payload, ["cwd"]) ?? process.cwd();
  const followup = await onSessionStop(undefined, { cwd });
  return followup || null;
}

export async function runReflect(
  envelope: (followup: string) => unknown,
): Promise<void> {
  await withFailOpen(async () => {
    const followup = await reflectFollowupFromPayload(parseStdinJson());
    if (!followup) {
      writeJson({});
      return;
    }
    writeJson(envelope(followup));
  });
}

/**
 * Claude Code Stop + asyncRewake: exit 2 + stderr wakes the same idle session.
 * additionalContext on an async Stop waits for the next user prompt, so it misses reflect.
 */
export async function runClaudeCodeReflectRewake(): Promise<void> {
  await withFailOpen(async () => {
    const followup = await reflectFollowupFromPayload(parseStdinJson());
    if (!followup) {
      writeJson({});
      return;
    }
    process.stderr.write(followup.endsWith("\n") ? followup : `${followup}\n`);
    process.exit(2);
  });
}
