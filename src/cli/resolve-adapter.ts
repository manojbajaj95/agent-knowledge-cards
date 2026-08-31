/**
 * Resolve a runnable adapter path inside the knowcards package.
 */
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export type HostId = "claude-code" | "cursor" | "codex" | "pi";
export type AdapterAction = "fetch" | "reflect";

const ADAPTER_STEM: Record<
  Exclude<HostId, "pi">,
  Record<AdapterAction, string>
> = {
  "claude-code": {
    fetch: "claude-code-fetch",
    reflect: "claude-code-reflect",
  },
  cursor: {
    fetch: "cursor-fetch",
    reflect: "cursor-reflect",
  },
  codex: {
    fetch: "codex-fetch",
    reflect: "codex-reflect",
  },
};

const PI_STEM = "pi";

function resolveBuiltFile(stem: string): string {
  const js = `${stem}.js`;
  const ts = `${stem}.ts`;
  const require = createRequire(import.meta.url);
  const here = dirname(fileURLToPath(import.meta.url));

  const candidates = [
    () => require.resolve(`knowcards/adapters/${stem}`),
    () => join(here, "..", "adapters", js),
    () => join(here, "..", "adapters", ts),
    () => join(process.cwd(), "dist", "adapters", js),
    () => join(process.cwd(), "src", "adapters", ts),
    () =>
      join(process.cwd(), "node_modules", "knowcards", "dist", "adapters", js),
  ];

  for (const get of candidates) {
    try {
      const p = get();
      if (existsSync(p)) return p;
    } catch {
      // try next
    }
  }

  return join(here, "..", "adapters", js);
}

/**
 * Absolute path to a built adapter .js file.
 */
export function resolveAdapterPath(
  host: Exclude<HostId, "pi">,
  action: AdapterAction,
): string {
  return resolveBuiltFile(ADAPTER_STEM[host][action]);
}

/** Absolute path to the Pi extension factory. */
export function resolvePiExtensionPath(): string {
  return resolveBuiltFile(PI_STEM);
}

/**
 * ESM specifier for `.pi/extensions/knowcards.ts`.
 * Prefer a path relative to cwd when the file lives in this project.
 */
export function piExtensionImportSpec(cwd: string, fromDir: string): string {
  const relativeCandidates = [
    join("dist", "adapters", "pi.js"),
    join("src", "adapters", "pi.ts"),
    join("node_modules", "knowcards", "dist", "adapters", "pi.js"),
  ];
  const rel = relativeCandidates.find((r) => existsSync(join(cwd, r)));
  if (rel) {
    const spec = relative(fromDir, join(cwd, rel)).split(sep).join("/");
    return spec.startsWith(".") ? spec : `./${spec}`;
  }
  return resolvePiExtensionPath();
}

/** Shell command that runs an adapter with Node (cwd-relative when possible). */
export function adapterCommand(
  host: Exclude<HostId, "pi">,
  action: AdapterAction,
): string {
  const stem = ADAPTER_STEM[host][action];
  const file = `${stem}.js`;
  const relativePath = [
    join("dist", "adapters", file),
    join("node_modules", "knowcards", "dist", "adapters", file),
  ].find((rel) => existsSync(join(process.cwd(), rel)));
  const path = relativePath ?? resolveAdapterPath(host, action);
  return `node ${JSON.stringify(path)}`;
}
