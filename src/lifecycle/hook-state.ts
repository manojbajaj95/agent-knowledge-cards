import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DEFAULT_CARDS_ROOT } from "../core/types/index.ts";

export const HOOK_STATE_FILE = ".hook-state.json";

export type HookState = {
  sessionId?: string;
  injectedSlugs: string[];
  lastInject?: string;
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
    const injectedSlugs = Array.isArray(o.injectedSlugs)
      ? o.injectedSlugs.filter((s): s is string => typeof s === "string")
      : [];
    return {
      sessionId: typeof o.sessionId === "string" ? o.sessionId : undefined,
      injectedSlugs,
      lastInject: typeof o.lastInject === "string" ? o.lastInject : undefined,
    };
  } catch {
    return null;
  }
}

export async function saveHookState(
  state: HookState,
  root: string = DEFAULT_CARDS_ROOT,
): Promise<void> {
  const path = hookStatePath(root);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state)}\n`, "utf8");
}
