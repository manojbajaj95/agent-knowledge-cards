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
import { openLibrary } from "../src/core/storage.ts";
import { allCards } from "../src/core/types/index.ts";

describe("eval metrics", () => {
  test("metricsFromTrial reads cost and duration", () => {
    const row = metricsFromTrial({
      task_name: "t",
      trial_name: "t__1",
      agent_result: {
        cost_usd: 0.02,
        n_input_tokens: 100,
        n_output_tokens: 50,
      },
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

  test("duration is agent_execution only", () => {
    const row = metricsFromTrial({
      agent_result: { cost_usd: 0.02 },
      agent_execution: {
        started_at: "2026-08-07T10:00:00.000Z",
        finished_at: "2026-08-07T10:00:30.000Z",
      },
      started_at: "2026-08-07T09:59:00.000Z",
      finished_at: "2026-08-07T10:02:00.000Z",
    });
    expect(row.durationSec).toBe(30);
  });

  test("duration is null without agent_execution", () => {
    const row = metricsFromTrial({
      agent_result: { cost_usd: 0.02 },
      started_at: "2026-08-07T09:59:00.000Z",
      finished_at: "2026-08-07T10:02:00.000Z",
    });
    expect(row.durationSec).toBeNull();
  });

  test("prompt tokens split Harbor input that includes cache", () => {
    const row = metricsFromTrial({
      agent_result: {
        cost_usd: 0.0028,
        n_input_tokens: 20698,
        n_cache_tokens: 20674,
        n_output_tokens: 1131,
      },
      agent_execution: {
        started_at: "2026-08-07T10:00:00.000Z",
        finished_at: "2026-08-07T10:00:27.000Z",
      },
    });
    expect(row.inputTokens).toBe(24);
    expect(row.cacheTokens).toBe(20674);
    expect(row.costUsd).toBe(0.0028);
  });

  test("compareVariants delta is with − without", () => {
    const withKnowcards = aggregateVariant("with-knowcards", "/w", [
      {
        agent_result: { cost_usd: 0.01 },
        verifier_result: { rewards: { reward: 1 } },
        agent_execution: {
          started_at: "2026-08-07T10:00:00.000Z",
          finished_at: "2026-08-07T10:00:30.000Z",
        },
      },
    ]);
    const withoutKnowcards = aggregateVariant("without-knowcards", "/o", [
      {
        agent_result: { cost_usd: 0.04 },
        verifier_result: { rewards: { reward: 1 } },
        agent_execution: {
          started_at: "2026-08-07T10:00:00.000Z",
          finished_at: "2026-08-07T10:02:00.000Z",
        },
      },
    ]);
    const report = compareVariants(withKnowcards, withoutKnowcards);
    expect(report.delta.meanCostUsd).toBeCloseTo(-0.03);
    expect(report.delta.meanDurationSec).toBeCloseTo(-90);
    expect(formatCompareReport(report)).toContain("with-knowcards");
    expect(formatCompareReport(report)).toContain("cache_tok");
  });

  test("compareJobDirs reads sample Harbor fixtures", async () => {
    const report = await compareJobDirs(
      "eval/fixtures/sample-results/with-cards",
      "eval/fixtures/sample-results/without-cards",
    );
    expect(report.withKnowcards.meanCostUsd).toBeCloseTo(0.012);
    expect(report.withoutKnowcards.meanCostUsd).toBeCloseTo(0.034);
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
  });

  test("loadTemplateCards reads payments-cents seed notebook", async () => {
    const cards = await loadTemplateCards("eval/templates/payments-cents");
    expect(cards).toHaveLength(1);
    expect(cards[0]!.title).toContain("integer cents");
    expect(cards[0]!.slug).toBe("integer-cents");
    expect(cards[0]!.useWhen).toContain("payments");
  });

  test("prepareHarborDataset writes one payments-cents task", async () => {
    const { tasks } = await prepareHarborDataset(["payments-cents"], {
      pack: false,
    });
    expect(tasks).toHaveLength(1);
    const { taskPath } = tasks[0]!;
    const instruction = await Bun.file(join(taskPath, "instruction.md")).text();

    expect(instruction).toContain("apply_discount");
    expect(instruction).not.toContain("KNOWLEDGE CARDS (trusted memory)");
    expect(
      await Bun.file(
        join(taskPath, "seed_cards", "default", "integer-cents.md"),
      ).exists(),
    ).toBe(true);
    expect(
      (
        await Array.fromAsync(
          new Bun.Glob("**/*.md").scan({
            cwd: join(taskPath, "seed_cards"),
            onlyFiles: true,
          }),
        )
      ).length,
    ).toBe(1);
    expect(
      await Bun.file(
        join(
          taskPath,
          "environment",
          ".agents",
          "knowledge_cards",
          "default",
          "integer-cents.md",
        ),
      ).exists(),
    ).toBe(false);
    expect(
      await Bun.file(join(taskPath, "environment", "AGENTS.md")).exists(),
    ).toBe(false);
    expect(await Bun.file(join(taskPath, "cards")).exists()).toBe(false);
    expect(
      await Bun.file(join(taskPath, "environment", "payments.py")).exists(),
    ).toBe(true);
    const toml = await Bun.file(join(taskPath, "task.toml")).text();
    expect(toml).toContain('skills_dir = "/skills"');
    expect(toml).toContain("payments-cents");
    const dockerfile = await Bun.file(
      join(taskPath, "environment", "Dockerfile"),
    ).text();
    expect(dockerfile).toContain("@earendil-works/pi-coding-agent@");
    expect(dockerfile).toContain("PI_VERSION=0.84.2");
  });

  test("prepareHarborDataset writes one repo-map task", async () => {
    const { tasks } = await prepareHarborDataset(["repo-map"], { pack: false });
    const { taskPath } = tasks[0]!;
    const instruction = await Bun.file(join(taskPath, "instruction.md")).text();

    expect(instruction).toContain("EU-WIDGET");
    expect(instruction).not.toContain("KNOWLEDGE CARDS (trusted memory)");
    expect(
      await Bun.file(
        join(taskPath, "seed_cards", "default", "sku-normalization.md"),
      ).exists(),
    ).toBe(true);
    expect(
      (
        await Array.fromAsync(
          new Bun.Glob("**/*.md").scan({
            cwd: join(taskPath, "seed_cards"),
            onlyFiles: true,
          }),
        )
      ).length,
    ).toBe(1);
    expect(
      await Bun.file(
        join(
          taskPath,
          "environment",
          ".agents",
          "knowledge_cards",
          "default",
          "sku-normalization.md",
        ),
      ).exists(),
    ).toBe(false);
    expect(
      await Bun.file(join(taskPath, "environment", "AGENTS.md")).exists(),
    ).toBe(false);
    expect(
      await Bun.file(
        join(
          taskPath,
          "environment",
          "core",
          "pipeline",
          "steps",
          "sku_normalize.py",
        ),
      ).exists(),
    ).toBe(true);
    expect(
      await Bun.file(
        join(taskPath, "environment", "decoys", "handlers", "update_sku.py"),
      ).exists(),
    ).toBe(true);
    const dockerfile = await Bun.file(
      join(taskPath, "environment", "Dockerfile"),
    ).text();
    expect(dockerfile).toContain("@earendil-works/pi-coding-agent@");
    expect(dockerfile).toContain("PI_VERSION=0.84.2");
  });
});
