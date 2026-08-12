/**
 * Resolve a runnable adapter path inside the knowcards package.
 */
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type HostId = "claude-code" | "cursor" | "codex";
export type AdapterAction = "inject" | "reflect";

const ADAPTER_STEM: Record<HostId, Record<AdapterAction, string>> = {
  "claude-code": {
    inject: "claude-code-inject",
    reflect: "claude-code-reflect",
  },
  cursor: {
    inject: "cursor-inject",
    reflect: "cursor-reflect",
  },
  codex: {
    inject: "codex-inject",
    reflect: "codex-reflect",
  },
};

/**
 * Absolute path to a built adapter .js file.
 */
export function resolveAdapterPath(
  host: HostId,
  action: AdapterAction,
): string {
  const stem = ADAPTER_STEM[host][action];
  const file = `${stem}.js`;
  const require = createRequire(import.meta.url);
  const here = dirname(fileURLToPath(import.meta.url));

  const candidates = [
    () => require.resolve(`knowcards/adapters/${stem}`),
    () => join(here, "..", "adapters", file),
    () => join(process.cwd(), "dist", "adapters", file),
    () =>
      join(
        process.cwd(),
        "node_modules",
        "knowcards",
        "dist",
        "adapters",
        file,
      ),
  ];

  for (const get of candidates) {
    try {
      const p = get();
      if (existsSync(p)) return p;
    } catch {
      // try next
    }
  }

  return join(here, "..", "adapters", file);
}

/** Shell command that runs an adapter with Node. */
export function adapterCommand(host: HostId, action: AdapterAction): string {
  return `node ${JSON.stringify(resolveAdapterPath(host, action))}`;
}
