import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatCardsForInject } from "../src/core/inject.ts";
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

  test("empty prompt injects empty block", async () => {
    const inject = await onSessionPrompt("  ", { root: SAMPLE });
    expect(inject).toBe(formatCardsForInject([]));
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
    const hits = [...inject.matchAll(/^\[\d+\] /gm)];
    expect(hits).toHaveLength(INJECT_CARD_CAP);
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
    const body = "token ".repeat(400);
    for (let i = 0; i < INJECT_CARD_CAP; i++) {
      await writeFile(
        join(dir, `token-fact-${i}.md`),
        cardMd(`Token fact ${i}`, body),
      );
    }
    const inject = await onSessionPrompt("token fact", { root });
    expect(inject.length).toBeLessThanOrEqual(INJECT_CHAR_CAP);
    expect(inject).toContain("[1] (token-fact-0)");
  });
});
