import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  reflectFollowupFromPayload,
  shouldSkipReflect,
} from "../src/adapters/run.ts";
import { deleteCard, proposeCard, updateCard } from "../src/core/ingestion.ts";
import { formatCardsForInject, slugsFromInject } from "../src/core/inject.ts";
import { queryLibrary } from "../src/core/retrieval.ts";
import { openLibrary } from "../src/core/storage.ts";
import {
  INJECT_CARD_CAP,
  INJECT_CHAR_CAP,
  onSessionPrompt,
} from "../src/lifecycle/session.ts";

const SAMPLE = "eval/fixtures/sample-library";

function cardMd(title: string, body: string): string {
  return `---
id: ${crypto.randomUUID()}
createdAt: 2026-08-01T00:00:00.000Z
updatedAt: 2026-08-01T00:00:00.000Z
title: ${title}
---

${body}
`;
}

describe("retrieve and inject", () => {
  const temps: string[] = [];

  afterEach(async () => {
    await Promise.all(temps.splice(0).map((d) => rm(d, { recursive: true })));
  });

  test("empty prompt injects nothing", async () => {
    const inject = await onSessionPrompt("  ", { root: SAMPLE });
    expect(inject.text).toBe("");
    expect(inject.slugs).toEqual([]);
  });

  test("payments query ranks integer-cents first", async () => {
    const { library } = await openLibrary(SAMPLE);
    const cards = queryLibrary(library, "payments");
    expect(cards[0]?.slug).toBe("integer-cents");
  });

  test("loadAll skips a corrupt card file", async () => {
    const root = await mkdtemp(join(tmpdir(), "kc-bad-"));
    temps.push(root);
    const dir = join(root, "default");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "good.md"), cardMd("Good card", "Keep this."));
    await writeFile(join(dir, "bad.md"), "no frontmatter\n");
    const { library } = await openLibrary(root);
    expect(library.notebooks[0]?.cards.map((c) => c.slug)).toEqual(["good"]);
  });

  test("onSessionPrompt caps inject hits", async () => {
    const root = await mkdtemp(join(tmpdir(), "kc-cap-"));
    temps.push(root);
    const dir = join(root, "default");
    await mkdir(dir, { recursive: true });
    for (let i = 0; i < INJECT_CARD_CAP + 4; i++) {
      await writeFile(
        join(dir, `alpha-fact-${i}.md`),
        cardMd(`Alpha fact ${i}`, "alpha retrieval token"),
      );
    }
    const inject = await onSessionPrompt("alpha", { root });
    const hits = [...inject.text.matchAll(/^\[\d+\] /gm)];
    expect(hits).toHaveLength(INJECT_CARD_CAP);
    expect(inject.slugs).toHaveLength(INJECT_CARD_CAP);
  });

  test("short query still prefix-matches", async () => {
    const root = await mkdtemp(join(tmpdir(), "kc-prefix-"));
    temps.push(root);
    const dir = join(root, "default");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "improving-tests.md"),
      cardMd("Improving tests", "x"),
    );
    await writeFile(join(dir, "other.md"), cardMd("Other note", "unrelated"));
    const { library } = await openLibrary(root);
    const cards = queryLibrary(library, "improv");
    expect(cards.map((c) => c.slug)).toEqual(["improving-tests"]);
  });

  test("long prompt does not prefix-match filler stems", async () => {
    const root = await mkdtemp(join(tmpdir(), "kc-long-"));
    temps.push(root);
    const dir = join(root, "default");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "improving-tests.md"),
      cardMd("Improving tests", "x"),
    );
    await writeFile(
      join(dir, "retrieve-ranking.md"),
      cardMd("Retrieve ranking", "retrieve ranking token"),
    );
    const { library } = await openLibrary(root);
    const cards = queryLibrary(
      library,
      "Lets improve retrieve functionality suggest a quick improvement",
    );
    expect(cards.map((c) => c.slug)).toEqual(["retrieve-ranking"]);
  });

  test("onSessionPrompt drops cards to stay under char cap", async () => {
    const root = await mkdtemp(join(tmpdir(), "kc-chars-"));
    temps.push(root);
    const dir = join(root, "default");
    await mkdir(dir, { recursive: true });
    const titlePad = "x".repeat(2000);
    for (let i = 0; i < INJECT_CARD_CAP; i++) {
      await writeFile(
        join(dir, `token-fact-${i}.md`),
        cardMd(`Token fact ${i} ${titlePad}`, "token fact body"),
      );
    }
    const inject = await onSessionPrompt("token fact", { root });
    expect(inject.text.length).toBeLessThanOrEqual(INJECT_CHAR_CAP);
    expect(inject.text).toContain("[1] (token-fact-0)");
  });

  test("formatCardsForInject is title-first", () => {
    const text = formatCardsForInject([
      {
        id: "1",
        title: "Visible title",
        slug: "visible-title",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
        useWhen: "debugging inject",
        body: "SECRET BODY MUST NOT APPEAR",
      },
    ]);
    expect(text).toContain("Visible title");
    expect(text).toContain("Use when: debugging inject");
    expect(text).not.toContain("SECRET BODY MUST NOT APPEAR");
    expect(slugsFromInject(text)).toEqual(["visible-title"]);
  });

  test("onSessionPrompt skips already injected slugs", async () => {
    const inject = await onSessionPrompt("payments", {
      root: SAMPLE,
      skipSlugs: ["integer-cents"],
    });
    expect(inject.text).not.toContain("(integer-cents)");
    expect(inject.slugs).not.toContain("integer-cents");
  });

  test("shouldSkipReflect when transcript has no file edits", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kc-tx-"));
    temps.push(dir);
    const path = join(dir, "t.jsonl");
    await writeFile(path, '{"message":{"content":[{"name":"Read"}]}}\n');
    expect(shouldSkipReflect({ transcript_path: path })).toBe(true);
    expect(shouldSkipReflect({ stop_hook_active: true })).toBe(true);
    expect(shouldSkipReflect({ loop_count: 1 })).toBe(true);
  });

  test("shouldSkipReflect allows reflect after Write", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kc-txw-"));
    temps.push(dir);
    const path = join(dir, "t.jsonl");
    await writeFile(path, '{"message":{"content":[{"name":"Write"}]}}\n');
    expect(shouldSkipReflect({ transcript_path: path })).toBe(false);
  });

  test("reflectFollowupFromPayload is null when Stop already looped", async () => {
    expect(await reflectFollowupFromPayload({ stop_hook_active: true })).toBe(
      null,
    );
    expect(await reflectFollowupFromPayload({ loop_count: 1 })).toBe(null);
  });

  test("update renames the file when title changes; delete unlinks it", async () => {
    const root = await mkdtemp(join(tmpdir(), "kc-crud-"));
    temps.push(root);
    const { storage, library } = await openLibrary(root);
    const nb = library.notebooks[0] ?? { id: "default", cards: [] };
    const { card: created } = proposeCard(nb, {
      title: "Old title",
      body: "first",
    });
    await storage.writeCard("default", created);
    const { card: updated, previousSlug } = updateCard(
      { id: "default", cards: [created] },
      created.slug,
      { title: "New title", body: "second" },
    );
    await storage.writeCard("default", updated);
    await storage.deleteCard("default", previousSlug);
    const afterUpdate = await openLibrary(root);
    expect(afterUpdate.library.notebooks[0]?.cards.map((c) => c.slug)).toEqual([
      "new-title",
    ]);
    expect(afterUpdate.library.notebooks[0]?.cards[0]?.body).toBe("second");
    const { card: removed } = deleteCard(
      afterUpdate.library.notebooks[0] ?? { id: "default", cards: [] },
      "new-title",
    );
    await storage.deleteCard("default", removed.slug);
    const afterDelete = await openLibrary(root);
    expect(afterDelete.library.notebooks[0]?.cards).toEqual([]);
  });
});
