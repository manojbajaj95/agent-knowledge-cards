import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { compareJobDirs } from "../eval/compare.ts";
import {
  aggregateVariant,
  compareVariants,
  formatCompareReport,
  metricsFromTrial,
} from "../eval/metrics.ts";
import { loadTemplateCards, prepareHarborDataset } from "../eval/prepare.ts";
import {
  KNOWLEDGE_CARDS_HEADER,
  TRUST_REMINDER,
  formatCardsForInject,
} from "../src/core/inject.ts";
import { openLibrary } from "../src/core/storage.ts";
import { allCards } from "../src/core/types/index.ts";

describe("eval metrics", () => {
  test("metricsFromTrial reads cost and duration", () => {
    const row = metricsFromTrial({
      task_name: "t",
      trial_name: "t__1",
      agent_result: { cost_usd: 0.02, n_input_tokens: 100, n_output_tokens: 50 },
      verifier_result: { rewards: { reward: 1 } },
      agent_execution: {
        started_at: "2026-08-07T10:00:00.000Z",
        finished_at: "2026-08-07T10:01:00.000Z",
      },
    });
    expect(row.costUsd).toBe(0.02);
    expect(row.durationSec).toBe(60);
    expect(row.reward).toBe(1);
  });

  test("compareVariants delta is with − without", () => {
    const withCards = aggregateVariant("with-cards", "/w", [
      {
        agent_result: { cost_usd: 0.01 },
        verifier_result: { rewards: { reward: 1 } },
        agent_execution: {
          started_at: "2026-08-07T10:00:00.000Z",
          finished_at: "2026-08-07T10:00:30.000Z",
        },
      },
    ]);
    const withoutCards = aggregateVariant("without-cards", "/o", [
      {
        agent_result: { cost_usd: 0.04 },
        verifier_result: { rewards: { reward: 1 } },
        agent_execution: {
          started_at: "2026-08-07T10:00:00.000Z",
          finished_at: "2026-08-07T10:02:00.000Z",
        },
      },
    ]);
    const report = compareVariants(withCards, withoutCards);
    expect(report.delta.meanCostUsd).toBeCloseTo(-0.03);
    expect(report.delta.meanDurationSec).toBeCloseTo(-90);
    expect(formatCompareReport(report)).toContain("with-cards");
  });

  test("compareJobDirs reads sample Harbor fixtures", async () => {
    const report = await compareJobDirs(
      "eval/fixtures/sample-results/with-cards",
      "eval/fixtures/sample-results/without-cards",
    );
    expect(report.withCards.meanCostUsd).toBeCloseTo(0.012);
    expect(report.withoutCards.meanCostUsd).toBeCloseTo(0.034);
    expect(report.delta.meanDurationSec).toBeCloseTo(-75);
  });
});

describe("eval prepare", () => {
  test("sample-library loads via openLibrary", async () => {
    const { library } = await openLibrary("eval/fixtures/sample-library");
    const cards = allCards(library);
    expect(library.notebooks.map((n) => n.id)).toEqual(["default"]);
    expect(cards).toHaveLength(3);
    expect(cards.some((c) => c.slug === "integer-cents")).toBe(true);
    const inject = formatCardsForInject(cards);
    expect(inject).toContain(KNOWLEDGE_CARDS_HEADER);
    expect(inject).toContain(TRUST_REMINDER);
  });

  test("loadTemplateCards reads payments-cents seed notebook", async () => {
    const cards = await loadTemplateCards("eval/templates/payments-cents");
    expect(cards).toHaveLength(1);
    expect(cards[0]!.title).toContain("integer cents");
    expect(cards[0]!.slug).toBe("integer-cents");
    expect(cards[0]!.useWhen).toContain("payments");
  });

  test("prepareHarborDataset writes payments-cents with/without", async () => {
    const { tasks } = await prepareHarborDataset(["payments-cents"]);
    expect(tasks).toHaveLength(1);
    const { withCards, withoutCards } = tasks[0]!;
    const withText = await Bun.file(join(withCards, "instruction.md")).text();
    const withoutText = await Bun.file(join(withoutCards, "instruction.md")).text();

    expect(withText).toContain(KNOWLEDGE_CARDS_HEADER);
    expect(withText).toContain(TRUST_REMINDER);
    expect(withText).toContain("[1] (integer-cents)");
    expect(withText).toContain("Payment amounts are integer cents");
    expect(withText).toContain("Use when: fixing payments or apply_discount");
    expect(withText).toContain("integer cents");
    expect(withText).toContain("conflicting README");
    expect(withoutText).not.toContain(KNOWLEDGE_CARDS_HEADER);
    expect(await Bun.file(join(withCards, "cards")).exists()).toBe(false);
    expect(await Bun.file(join(withCards, "environment", "payments.py")).exists()).toBe(
      true,
    );
  });

  test("prepareHarborDataset writes repo-map structure card", async () => {
    const { tasks } = await prepareHarborDataset(["repo-map"]);
    const { withCards, withoutCards } = tasks[0]!;
    const withText = await Bun.file(join(withCards, "instruction.md")).text();
    const withoutText = await Bun.file(join(withoutCards, "instruction.md")).text();

    expect(withText).toContain(KNOWLEDGE_CARDS_HEADER);
    expect(withText).toContain("[1] (sku-normalization)");
    expect(withText).toContain("Live SKU normalize path");
    expect(withText).toContain("Use when: fixing EU SKU prefix or normalize_sku");
    expect(withText).toContain("core/pipeline/steps/sku_normalize.py");
    expect(withText).toContain("decoys/handlers/update_sku.py");
    expect(withoutText).not.toContain(KNOWLEDGE_CARDS_HEADER);
    expect(withoutText).toContain("EU-WIDGET");
    expect(
      await Bun.file(
        join(withCards, "environment", "core", "pipeline", "steps", "sku_normalize.py"),
      ).exists(),
    ).toBe(true);
    expect(
      await Bun.file(join(withCards, "environment", "decoys", "handlers", "update_sku.py")).exists(),
    ).toBe(true);
  });
});
