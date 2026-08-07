import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatCardsForInject } from "../src/adapters/custom-harness.ts";
import { proposeCard } from "../src/core/ingestion.ts";
import { reflect } from "../src/core/reflection.ts";
import { getCard, queryCards } from "../src/core/retrieval.ts";
import { loadNotebook, saveNotebook } from "../src/core/storage.ts";
import { emptyNotebook } from "../src/core/types.ts";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function tempNotebookPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "kc-"));
  tempDirs.push(dir);
  return join(dir, "notebook.json");
}

describe("knowledge cards core", () => {
  test("propose → save → load → query", async () => {
    const path = await tempNotebookPath();
    let nb = emptyNotebook();
    nb = proposeCard(nb, "Use when: login\nJWT in Authorization header");
    nb = proposeCard(nb, "Amounts are integer cents");
    await saveNotebook(nb, path);

    const loaded = await loadNotebook(path);
    expect(loaded.cards).toHaveLength(2);
    expect(queryCards(loaded, "jwt")).toHaveLength(1);
    expect(queryCards(loaded, "")).toHaveLength(2);
    expect(getCard(loaded, loaded.cards[0]!.id)?.body).toContain("JWT");
  });

  test("load missing file returns empty notebook", async () => {
    const path = await tempNotebookPath();
    const nb = await loadNotebook(path);
    expect(nb.cards).toEqual([]);
  });

  test("reflect stub appends a card from episode text", () => {
    const nb = reflect(emptyNotebook(), {
      text: "Agent learned that the API rate limit is 100 rpm.",
    });
    expect(nb.cards).toHaveLength(1);
    expect(nb.cards[0]!.body).toContain("100 rpm");
  });

  test("reflect no-ops on empty episode", () => {
    const nb = reflect(emptyNotebook(), { text: "  " });
    expect(nb.cards).toHaveLength(0);
  });

  test("formatCardsForInject includes trust header", () => {
    const text = formatCardsForInject([
      {
        id: "abc",
        body: "fact",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    ]);
    expect(text).toContain("KNOWLEDGE CARDS");
    expect(text).toContain("fact");
  });
});
