import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  mutationFingerprint,
  reflectFollowupFromPayload,
  shouldSkipReflect,
} from "../src/adapters/run.ts";
import {
  FETCH_CARD_CAP,
  FETCH_CHAR_CAP,
  fetchCards,
  formatCardsForFetch,
  slugsFromFetch,
} from "../src/harness/fetch.ts";
import {
  deleteCard,
  proposeCard,
  updateCard,
} from "../src/memory/ingestion.ts";
import { queryLibrary } from "../src/memory/retrieval.ts";
import { openLibrary } from "../src/memory/storage.ts";

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

describe("retrieve and fetch", () => {
  const temps: string[] = [];

  afterEach(async () => {
    await Promise.all(temps.splice(0).map((d) => rm(d, { recursive: true })));
  });

  test("empty prompt fetches nothing", async () => {
    const fetched = await fetchCards("  ", { root: SAMPLE });
    expect(fetched.text).toBe("");
    expect(fetched.slugs).toEqual([]);
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

  test("fetchCards caps fetch hits", async () => {
    const root = await mkdtemp(join(tmpdir(), "kc-cap-"));
    temps.push(root);
    const dir = join(root, "default");
    await mkdir(dir, { recursive: true });
    for (let i = 0; i < FETCH_CARD_CAP + 4; i++) {
      await writeFile(
        join(dir, `alpha-fact-${i}.md`),
        cardMd(`Alpha fact ${i}`, "alpha retrieval token"),
      );
    }
    const fetched = await fetchCards("alpha", { root });
    const hits = [...fetched.text.matchAll(/^\[\d+\] /gm)];
    expect(hits).toHaveLength(FETCH_CARD_CAP);
    expect(fetched.slugs).toHaveLength(FETCH_CARD_CAP);
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

  test("fetchCards drops cards to stay under char cap", async () => {
    const root = await mkdtemp(join(tmpdir(), "kc-chars-"));
    temps.push(root);
    const dir = join(root, "default");
    await mkdir(dir, { recursive: true });
    const titlePad = "x".repeat(2000);
    for (let i = 0; i < FETCH_CARD_CAP; i++) {
      await writeFile(
        join(dir, `token-fact-${i}.md`),
        cardMd(`Token fact ${i} ${titlePad}`, "token fact body"),
      );
    }
    const fetched = await fetchCards("token fact", { root });
    expect(fetched.text.length).toBeLessThanOrEqual(FETCH_CHAR_CAP);
    expect(fetched.text).toContain("[1] (token-fact-0)");
  });

  test("formatCardsForFetch is title-first", () => {
    const text = formatCardsForFetch([
      {
        id: "1",
        title: "Visible title",
        slug: "visible-title",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
        useWhen: "debugging fetch",
        body: "SECRET BODY MUST NOT APPEAR",
      },
    ]);
    expect(text).toContain("Visible title");
    expect(text).toContain("Use when: debugging fetch");
    expect(text).not.toContain("SECRET BODY MUST NOT APPEAR");
    expect(slugsFromFetch(text)).toEqual(["visible-title"]);
  });

  test("fetchCards skips already fetched slugs", async () => {
    const fetched = await fetchCards("payments", {
      root: SAMPLE,
      skipSlugs: ["integer-cents"],
    });
    expect(fetched.text).not.toContain("(integer-cents)");
    expect(fetched.slugs).not.toContain("integer-cents");
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
    expect(
      shouldSkipReflect(
        { transcript_path: path, loop_count: 1, session_id: "s1" },
        { fetchedSlugs: [], lastExtractFingerprint: "old" },
      ),
    ).toBe(false);
  });

  test("shouldSkipReflect when mutation fingerprint matches last extract", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kc-txfp-"));
    temps.push(dir);
    const path = join(dir, "t.jsonl");
    const text = '{"message":{"content":[{"name":"Write"}]}}\n';
    await writeFile(path, text);
    const fp = mutationFingerprint(text);
    expect(
      shouldSkipReflect(
        { transcript_path: path, session_id: "s1" },
        { fetchedSlugs: [], sessionId: "s1", lastExtractFingerprint: fp },
      ),
    ).toBe(true);
    expect(
      shouldSkipReflect(
        { transcript_path: path, session_id: "s2" },
        { fetchedSlugs: [], sessionId: "s1", lastExtractFingerprint: fp },
      ),
    ).toBe(false);
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
