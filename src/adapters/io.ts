import { readFileSync } from "node:fs";

/** Read full stdin as UTF-8 (hosts send one JSON object). */
export function readStdinText(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

export function parseStdinJson<T = Record<string, unknown>>(): T {
  const raw = readStdinText().trim();
  if (!raw) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}

export function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

/** Pick first non-empty string field from a loose host payload. */
export function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

export function pickBool(
  obj: Record<string, unknown>,
  keys: string[],
): boolean | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "boolean") return v;
  }
  return undefined;
}

export function pickNumber(
  obj: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}
