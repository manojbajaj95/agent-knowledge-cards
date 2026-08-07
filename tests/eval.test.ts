import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { compareJobDirs } from "../eval/compare.ts";
import {
  aggregateVariant,
  compareVariants,
  formatCompareReport,
  metricsFromTrial,
} from "../eval/metrics.ts";
import { prepareHarborDataset, selectEvalCards } from "../eval/prepare.ts";
import type { Notebook } from "../src/core/types.ts";

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
  test("selectEvalCards prefers payments/cents card", () => {
    const nb: Notebook = {
      cards: [
        {
          id: "1",
          body: "Use when: auth\nJWTs go in Authorization",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
        {
          id: "2",
          body: "Use when: payments\nAmounts are integer cents",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    };
    expect(selectEvalCards(nb)).toHaveLength(1);
    expect(selectEvalCards(nb)[0]!.body).toContain("integer cents");
  });

  test("prepareHarborDataset writes payments-cents with/without", async () => {
    const { tasks } = await prepareHarborDataset(["payments-cents"]);
    expect(tasks).toHaveLength(1);
    const { withCards, withoutCards } = tasks[0]!;
    const withText = await Bun.file(join(withCards, "instruction.md")).text();
    const withoutText = await Bun.file(join(withoutCards, "instruction.md")).text();
    expect(withText).toContain("KNOWLEDGE CARDS");
    expect(withText).toContain("integer cents");
    expect(withoutText).not.toContain("KNOWLEDGE CARDS");
    expect(await Bun.file(join(withCards, "environment", "payments.py")).exists()).toBe(
      true,
    );
  });

  test("prepareHarborDataset writes repo-map structure card", async () => {
    const { tasks } = await prepareHarborDataset(["repo-map"]);
    const { withCards, withoutCards } = tasks[0]!;
    const withText = await Bun.file(join(withCards, "instruction.md")).text();
    const withoutText = await Bun.file(join(withoutCards, "instruction.md")).text();
    expect(withText).toContain("core/pipeline/steps/sku_normalize.py");
    expect(withText).toContain("ignore legacy/");
    expect(withoutText).not.toContain("KNOWLEDGE CARDS");
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
