import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  type AdapterAction,
  adapterCommand,
  type HostId,
  piExtensionImportSpec,
} from "./resolve-adapter.ts";

type JsonObject = Record<string, unknown>;

const CURSOR_CONTEXT_RULE = ".cursor/rules/knowcards-context.mdc";

function isKnowcardsCommand(command: string | undefined): boolean {
  if (!command) return false;
  return (
    command.includes("knowcards") ||
    /claude-code-(fetch|inject|reflect)/.test(command) ||
    /cursor-(fetch|inject|reflect)/.test(command) ||
    /codex-(fetch|inject|reflect)/.test(command)
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

/** Append a gitignore line if missing (exact path match). */
async function ensureGitignoreLine(
  cwd: string,
  line: string,
): Promise<string | null> {
  const path = join(cwd, ".gitignore");
  let text = "";
  try {
    text = await readFile(path, "utf8");
  } catch {
    // create new
  }
  const lines = text.split(/\r?\n/);
  if (lines.some((l) => l.trim() === line)) return null;
  const next = text.endsWith("\n") || text === "" ? text : `${text}\n`;
  await writeFile(path, `${next}${line}\n`, "utf8");
  return path;
}

/** Claude Code / Codex nested hook list shape. */
function mergeNestedCommandHooks(
  existing: unknown,
  command: string,
  action: AdapterAction,
  extra?: JsonObject,
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
        timeout: action === "fetch" ? 30 : 60,
        ...extra,
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
    adapterCommand("claude-code", "fetch"),
    "fetch",
  );
  hooks.Stop = mergeNestedCommandHooks(
    hooks.Stop,
    adapterCommand("claude-code", "reflect"),
    "reflect",
    { async: true, asyncRewake: true },
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
    adapterCommand("cursor", "fetch"),
  );
  hooks.stop = mergeCursorHooks(
    hooks.stop,
    adapterCommand("cursor", "reflect"),
    { loop_limit: 1 },
  );

  config.version = config.version ?? 1;
  config.hooks = hooks;
  await writeJsonFile(hooksPath, config);
  const files = [hooksPath];
  const gitignore = await ensureGitignoreLine(cwd, CURSOR_CONTEXT_RULE);
  if (gitignore) files.push(gitignore);
  return files;
}

async function installCodex(cwd: string): Promise<string[]> {
  const hooksPath = join(cwd, ".codex", "hooks.json");
  const config = await readJsonFile(hooksPath);
  const hooks = (config.hooks as JsonObject | undefined) ?? {};

  hooks.UserPromptSubmit = mergeNestedCommandHooks(
    hooks.UserPromptSubmit,
    adapterCommand("codex", "fetch"),
    "fetch",
  );
  hooks.Stop = mergeNestedCommandHooks(
    hooks.Stop,
    adapterCommand("codex", "reflect"),
    "reflect",
  );

  if (typeof config.description !== "string") {
    config.description = "Knowcards session fetch + reflect";
  }
  config.hooks = hooks;
  await writeJsonFile(hooksPath, config);
  return [hooksPath];
}

async function installPi(
  cwd: string,
  opts: { global?: boolean } = {},
): Promise<string[]> {
  const extDir = opts.global
    ? join(homedir(), ".pi", "agent", "extensions")
    : join(cwd, ".pi", "extensions");
  await mkdir(extDir, { recursive: true });
  const spec = piExtensionImportSpec(cwd, extDir);
  const extPath = join(extDir, "knowcards.ts");
  await writeFile(
    extPath,
    `export { default } from ${JSON.stringify(spec)};\n`,
  );
  return [extPath];
}

export async function installHost(
  host: HostId,
  cwd: string = process.cwd(),
  opts: { global?: boolean } = {},
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
      notes.push(
        "Stop reflect is async + asyncRewake (same session after the turn ends)",
      );
      break;
    case "cursor":
      files = await installCursor(cwd);
      notes.push("Merged beforeSubmitPrompt + stop into .cursor/hooks.json");
      notes.push(
        `Fetch writes ${CURSOR_CONTEXT_RULE} (Cursor hooks cannot inject context)`,
      );
      notes.push(
        `Appended ${CURSOR_CONTEXT_RULE} to .gitignore if missing (hooks.json stays commitable)`,
      );
      notes.push(
        "Empty fetch unlinks the context rule; short follow-ups (< 3 words) skip rewrite",
      );
      notes.push(
        "Stop followup_message is a user message (host limit; no background wake)",
      );
      break;
    case "codex":
      files = await installCodex(cwd);
      notes.push("Merged UserPromptSubmit + Stop into .codex/hooks.json");
      notes.push(
        "Codex hooks are on by default; disable with [features] hooks = false",
      );
      notes.push(
        "Stop reflect stays sync: async Codex hooks do not start a new turn",
      );
      break;
    case "pi":
      files = await installPi(cwd, opts);
      if (opts.global) {
        notes.push(
          "Wrote ~/.pi/agent/extensions/knowcards.ts (print mode / evals)",
        );
      } else {
        notes.push(
          "Wrote .pi/extensions/knowcards.ts (project; needs Pi trust)",
        );
      }
      notes.push(
        "Fetch appends titles to the system prompt on before_agent_start",
      );
      notes.push(
        "Reflect follow-up runs on session_shutdown after write/edit (session end)",
      );
      break;
    default: {
      const _exhaustive: never = host;
      throw new Error(`Unknown host: ${_exhaustive}`);
    }
  }

  return { host, files, notes };
}
