import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DEFAULT_CARDS_ROOT } from "../memory/types/index.ts";

export const HOOK_STATE_FILE = ".hook-state.json";

export type HookState = {
  sessionId?: string;
  fetchedSlugs: string[];
  lastFetch?: string;
  /** Mutation fingerprint at last Stop reflect; skip until it changes. */
  lastExtractFingerprint?: string;
};

export function hookStatePath(root: string = DEFAULT_CARDS_ROOT): string {
  return join(root, HOOK_STATE_FILE);
}

export async function loadHookState(
  root: string = DEFAULT_CARDS_ROOT,
): Promise<HookState | null> {
  try {
    const parsed = JSON.parse(
      await readFile(hookStatePath(root), "utf8"),
    ) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return null;
    const o = parsed as Record<string, unknown>;
    // Prefer new keys; accept legacy injectedSlugs / lastInject from older installs.
    const fetchedSlugs = Array.isArray(o.fetchedSlugs)
      ? o.fetchedSlugs.filter((s): s is string => typeof s === "string")
      : Array.isArray(o.injectedSlugs)
        ? o.injectedSlugs.filter((s): s is string => typeof s === "string")
        : [];
    const lastFetch =
      typeof o.lastFetch === "string"
        ? o.lastFetch
        : typeof o.lastInject === "string"
          ? o.lastInject
          : undefined;
    return {
      sessionId: typeof o.sessionId === "string" ? o.sessionId : undefined,
      fetchedSlugs,
      lastFetch,
      lastExtractFingerprint:
        typeof o.lastExtractFingerprint === "string"
          ? o.lastExtractFingerprint
          : undefined,
    };
  } catch {
    return null;
  }
}

export async function saveHookState(
  patch: Partial<HookState>,
  root: string = DEFAULT_CARDS_ROOT,
): Promise<void> {
  const prev = await loadHookState(root);
  const state: HookState = {
    sessionId: patch.sessionId ?? prev?.sessionId,
    fetchedSlugs: patch.fetchedSlugs ?? prev?.fetchedSlugs ?? [],
    lastFetch: patch.lastFetch ?? prev?.lastFetch,
    lastExtractFingerprint:
      patch.lastExtractFingerprint ?? prev?.lastExtractFingerprint,
  };
  const path = hookStatePath(root);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state)}\n`, "utf8");
}
