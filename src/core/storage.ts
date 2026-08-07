import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  DEFAULT_NOTEBOOK_PATH,
  emptyNotebook,
  type Notebook,
} from "./types.ts";

function isNotebook(value: unknown): value is Notebook {
  if (value === null || typeof value !== "object") return false;
  const cards = (value as { cards?: unknown }).cards;
  if (!Array.isArray(cards)) return false;
  return cards.every(
    (card) =>
      card !== null &&
      typeof card === "object" &&
      typeof (card as { id?: unknown }).id === "string" &&
      typeof (card as { body?: unknown }).body === "string" &&
      typeof (card as { updatedAt?: unknown }).updatedAt === "string",
  );
}

/** Load a notebook from disk. Missing file → empty notebook. */
export async function loadNotebook(
  path: string = DEFAULT_NOTEBOOK_PATH,
): Promise<Notebook> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return emptyNotebook();
  }
  const data: unknown = await file.json();
  if (!isNotebook(data)) {
    throw new Error(`Invalid notebook at ${path}`);
  }
  return data;
}

/** Persist a notebook as JSON (creates parent dirs). */
export async function saveNotebook(
  notebook: Notebook,
  path: string = DEFAULT_NOTEBOOK_PATH,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, `${JSON.stringify(notebook, null, 2)}\n`);
}
