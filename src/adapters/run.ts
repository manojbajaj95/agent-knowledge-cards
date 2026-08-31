/**
 * Shared fetch/reflect runners. Host adapters only supply the envelope.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchCards } from "../harness/fetch.ts";
import {
  type HookState,
  loadHookState,
  saveHookState,
} from "../harness/hook-state.ts";
import { reflectFollowup } from "../harness/reflect.ts";
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
  if (sessionId && state?.sessionId === sessionId) return state.fetchedSlugs;
  return [];
}

function sessionIdFromPayload(payload: Record<string, unknown>): string {
  return pickString(payload, ["session_id", "conversation_id"]) ?? "";
}

/** Stable id of file-edit tool names in a transcript. Empty = no edits. */
export function mutationFingerprint(transcript: string): string {
  const parts: string[] = [];
  for (const m of transcript.matchAll(new RegExp(MUTATION_RE.source, "g"))) {
    parts.push(`${m[0]}:${m.index}`);
  }
  if (parts.length === 0) return "";
  return createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 16);
}

function fingerprintFromPayload(
  payload: Record<string, unknown>,
): string | null {
  const transcript = pickString(payload, ["transcript_path", "transcriptPath"]);
  if (!transcript) return null;
  try {
    return mutationFingerprint(readFileSync(transcript, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Skip reflect when Stop already looped, there are no new file edits,
 * or the mutation fingerprint matches the last extract for this session.
 */
export function shouldSkipReflect(
  payload: Record<string, unknown>,
  state: HookState | null = null,
): boolean {
  if (pickBool(payload, ["stop_hook_active"])) return true;
  const status = pickString(payload, ["status"]);
  if (status && status !== "completed") return true;
  const fingerprint = fingerprintFromPayload(payload);
  if (fingerprint === "") return true;
  if (fingerprint == null) {
    return (pickNumber(payload, ["loop_count"]) ?? 0) > 0;
  }
  const sessionId = sessionIdFromPayload(payload);
  return (
    state?.lastExtractFingerprint === fingerprint &&
    (!sessionId || !state.sessionId || state.sessionId === sessionId)
  );
}

export async function runAdditiveFetch(
  envelope: (text: string) => unknown,
): Promise<void> {
  await withFailOpen(async () => {
    const payload = parseStdinJson<Record<string, unknown>>();
    const prompt =
      pickString(payload, ["prompt", "user_prompt", "content", "message"]) ??
      "";
    const sessionId = sessionIdFromPayload(payload);
    const state = await loadHookState();
    const skipSlugs = skipSlugsForSession(sessionId, state);
    const fetched = await fetchCards(prompt, { skipSlugs });
    if (!fetched.text) {
      writeJson({});
      return;
    }
    if (!sessionId && state?.lastFetch === fetched.text) {
      writeJson({});
      return;
    }
    await saveHookState({
      sessionId: sessionId || state?.sessionId,
      fetchedSlugs: [...new Set([...skipSlugs, ...fetched.slugs])],
      lastFetch: fetched.text,
    });
    writeJson(envelope(fetched.text));
  });
}

export async function runCursorFetch(): Promise<void> {
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
    const fetched = await fetchCards(prompt);
    const outPath = join(process.cwd(), CURSOR_RULE_REL);
    if (!fetched.text) {
      try {
        await unlink(outPath);
      } catch {
        // missing is fine
      }
      writeJson({ continue: true });
      return;
    }
    const body = [
      "---",
      "description: Knowcards trusted memory (auto-fetched; do not edit by hand)",
      "alwaysApply: true",
      "---",
      "",
      fetched.text,
      "",
    ].join("\n");
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

/** Null when Stop should not continue (already looped, no new file edits, empty prompt). */
export async function reflectFollowupFromPayload(
  payload: Record<string, unknown>,
): Promise<string | null> {
  const state = await loadHookState();
  if (shouldSkipReflect(payload, state)) return null;
  const cwd = pickString(payload, ["cwd"]) ?? process.cwd();
  const followup = await reflectFollowup(undefined, { cwd });
  if (!followup) return null;
  const fingerprint = fingerprintFromPayload(payload);
  if (fingerprint) {
    await saveHookState({
      sessionId: sessionIdFromPayload(payload) || state?.sessionId,
      lastExtractFingerprint: fingerprint,
    });
  }
  return followup;
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
