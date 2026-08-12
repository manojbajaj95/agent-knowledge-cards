import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  type AdapterAction,
  adapterCommand,
  type HostId,
} from "./resolve-adapter.ts";

type JsonObject = Record<string, unknown>;

function isKnowcardsCommand(command: string | undefined): boolean {
  if (!command) return false;
  return (
    command.includes("knowcards") ||
    /claude-code-(inject|reflect)/.test(command) ||
    /cursor-(inject|reflect)/.test(command) ||
    /codex-(inject|reflect)/.test(command)
  );
}

async function readJsonFile(path: string): Promise<JsonObject> {
  try {
    const text = await readFile(path, "utf8");
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
  } catch {
    // missing or invalid
  }
  return {};
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/** Claude Code / Codex nested hook list shape. */
function mergeNestedCommandHooks(
  existing: unknown,
  command: string,
  action: AdapterAction,
): unknown[] {
  const list = Array.isArray(existing) ? [...existing] : [];
  const filtered = list.filter((entry) => {
    if (!entry || typeof entry !== "object") return true;
    const hooks = (entry as JsonObject).hooks;
    if (!Array.isArray(hooks)) return true;
    return !hooks.some(
      (h) =>
        h &&
        typeof h === "object" &&
        isKnowcardsCommand(String((h as JsonObject).command ?? "")),
    );
  });
  filtered.push({
    hooks: [
      {
        type: "command",
        command,
        timeout: action === "inject" ? 30 : 60,
        statusMessage:
          action === "inject" ? "Knowcards inject" : "Knowcards reflect",
      },
    ],
  });
  return filtered;
}

function mergeCursorHooks(
  existing: unknown,
  command: string,
  extra?: JsonObject,
): unknown[] {
  const list = Array.isArray(existing) ? [...existing] : [];
  const filtered = list.filter(
    (entry) =>
      !(
        entry &&
        typeof entry === "object" &&
        isKnowcardsCommand(String((entry as JsonObject).command ?? ""))
      ),
  );
  filtered.push({ command, ...extra });
  return filtered;
}

async function installClaudeCode(cwd: string): Promise<string[]> {
  const settingsPath = join(cwd, ".claude", "settings.json");
  const settings = await readJsonFile(settingsPath);
  const hooks = (settings.hooks as JsonObject | undefined) ?? {};

  hooks.UserPromptSubmit = mergeNestedCommandHooks(
    hooks.UserPromptSubmit,
    adapterCommand("claude-code", "inject"),
    "inject",
  );
  hooks.Stop = mergeNestedCommandHooks(
    hooks.Stop,
    adapterCommand("claude-code", "reflect"),
    "reflect",
  );

  settings.hooks = hooks;
  await writeJsonFile(settingsPath, settings);
  return [settingsPath];
}

async function installCursor(cwd: string): Promise<string[]> {
  const hooksPath = join(cwd, ".cursor", "hooks.json");
  const config = await readJsonFile(hooksPath);
  const hooks = (config.hooks as JsonObject | undefined) ?? {};

  hooks.beforeSubmitPrompt = mergeCursorHooks(
    hooks.beforeSubmitPrompt,
    adapterCommand("cursor", "inject"),
  );
  hooks.stop = mergeCursorHooks(
    hooks.stop,
    adapterCommand("cursor", "reflect"),
    { loop_limit: 1 },
  );

  config.version = config.version ?? 1;
  config.hooks = hooks;
  await writeJsonFile(hooksPath, config);
  return [hooksPath];
}

async function installCodex(cwd: string): Promise<string[]> {
  const hooksPath = join(cwd, ".codex", "hooks.json");
  const config = await readJsonFile(hooksPath);
  const hooks = (config.hooks as JsonObject | undefined) ?? {};

  hooks.UserPromptSubmit = mergeNestedCommandHooks(
    hooks.UserPromptSubmit,
    adapterCommand("codex", "inject"),
    "inject",
  );
  hooks.Stop = mergeNestedCommandHooks(
    hooks.Stop,
    adapterCommand("codex", "reflect"),
    "reflect",
  );

  if (typeof config.description !== "string") {
    config.description = "Knowcards session inject + reflect";
  }
  config.hooks = hooks;
  await writeJsonFile(hooksPath, config);
  return [hooksPath];
}

export async function installHost(
  host: HostId,
  cwd: string = process.cwd(),
): Promise<{ host: HostId; files: string[]; notes: string[] }> {
  let files: string[];
  const notes: string[] = [];

  switch (host) {
    case "claude-code":
      files = await installClaudeCode(cwd);
      notes.push("Merged UserPromptSubmit + Stop into .claude/settings.json");
      notes.push(
        "Hook commands use cwd-relative dist/ or node_modules/knowcards paths",
      );
      break;
    case "cursor":
      files = await installCursor(cwd);
      notes.push("Merged beforeSubmitPrompt + stop into .cursor/hooks.json");
      notes.push(
        "Inject writes .cursor/rules/knowcards-context.mdc (Cursor hooks cannot inject context)",
      );
      notes.push(
        "Short follow-ups (< 3 words) skip rewrite so the last inject stays",
      );
      break;
    case "codex":
      files = await installCodex(cwd);
      notes.push("Merged UserPromptSubmit + Stop into .codex/hooks.json");
      notes.push(
        "Codex hooks are on by default; disable with [features] hooks = false",
      );
      break;
    default: {
      const _exhaustive: never = host;
      throw new Error(`Unknown host: ${_exhaustive}`);
    }
  }

  return { host, files, notes };
}
