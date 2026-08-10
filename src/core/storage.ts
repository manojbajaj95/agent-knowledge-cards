import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCardMarkdown, serializeCardMarkdown } from "./markdown.ts";
import {
  DEFAULT_CARDS_ROOT,
  DEFAULT_NOTEBOOK_ID,
  emptyLibrary,
  emptyNotebook,
  type KnowledgeCard,
  type KnowledgeLibrary,
  type Notebook,
} from "./types/index.ts";

/**
 * Persistence for notebooks/cards.
 *
 * Today the product is filesystem-first: FsCardStorage is the only backend.
 * CardStorage stays abstract so a database backend can replace the filesystem
 * for multiplayer or production later.
 *
 * TODO: database storage backend (multiplayer / production)
 * TODO: full CRUD (update / delete) when cards are stale or edited
 */
export interface CardStorage {
  readonly root: string;
  /** Create root + default notebook directory if missing (filesystem). */
  init(): Promise<void>;
  /** Load every notebook and card into an in-memory library. */
  loadAll(): Promise<KnowledgeLibrary>;
  /** Write one card markdown file under notebookId/slug.md. */
  writeCard(notebookId: string, card: KnowledgeCard): Promise<void>;
}

/** Local filesystem backend: one directory per notebook, one `.md` per card. */
export class FsCardStorage implements CardStorage {
  constructor(readonly root: string = DEFAULT_CARDS_ROOT) {}

  async init(): Promise<void> {
    await mkdir(join(this.root, DEFAULT_NOTEBOOK_ID), { recursive: true });
  }

  async loadAll(): Promise<KnowledgeLibrary> {
    let entries: string[];
    try {
      entries = await readdir(this.root);
    } catch {
      return emptyLibrary(this.root);
    }

    const notebooks: Notebook[] = [];
    for (const name of entries.sort()) {
      if (name.startsWith(".")) continue;
      const notebookPath = join(this.root, name);
      // Skip non-directories by attempting to list; files fail readdir.
      let files: string[];
      try {
        files = await readdir(notebookPath);
      } catch {
        continue;
      }
      const cards: KnowledgeCard[] = [];
      for (const file of files.sort()) {
        if (!file.endsWith(".md") || file.startsWith(".")) continue;
        const slug = file.slice(0, -3);
        const raw = await readFile(join(notebookPath, file), "utf8");
        cards.push(parseCardMarkdown(slug, raw));
      }
      notebooks.push({ id: name, cards });
    }

    return { root: this.root, notebooks };
  }

  async writeCard(notebookId: string, card: KnowledgeCard): Promise<void> {
    const dir = join(this.root, notebookId);
    await mkdir(dir, { recursive: true });
    const path = join(dir, `${card.slug}.md`);
    await writeFile(path, serializeCardMarkdown(card), "utf8");
  }
}

/** Open storage and load the full library into memory (process start). */
export async function openLibrary(
  root: string = DEFAULT_CARDS_ROOT,
): Promise<{ storage: FsCardStorage; library: KnowledgeLibrary }> {
  const storage = new FsCardStorage(root);
  const library = await storage.loadAll();
  return { storage, library };
}

/** Ensure default notebook exists in memory (after init or for propose). */
export function requireNotebook(
  library: KnowledgeLibrary,
  notebookId: string = DEFAULT_NOTEBOOK_ID,
): Notebook {
  const existing = library.notebooks.find((n) => n.id === notebookId);
  if (existing) return existing;
  return emptyNotebook(notebookId);
}
