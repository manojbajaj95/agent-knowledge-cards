/** Harbor trial/job metrics used by the with/without cards A/B compare. */

export type TimingInfo = {
  started_at?: string | null;
  finished_at?: string | null;
};

export type AgentResult = {
  n_input_tokens?: number | null;
  n_cache_tokens?: number | null;
  n_output_tokens?: number | null;
  cost_usd?: number | null;
};

export type VerifierResult = {
  rewards?: Record<string, number> | null;
};

export type TrialResult = {
  task_name?: string;
  trial_name?: string;
  agent_result?: AgentResult | null;
  verifier_result?: VerifierResult | null;
  agent_execution?: TimingInfo | null;
  started_at?: string | null;
  finished_at?: string | null;
  exception_info?: { exception_type?: string; exception_message?: string } | null;
};

export type VariantMetrics = {
  variant: string;
  jobDir: string;
  nTrials: number;
  nErrors: number;
  meanReward: number | null;
  meanCostUsd: number | null;
  meanDurationSec: number | null;
  meanInputTokens: number | null;
  meanOutputTokens: number | null;
  trials: Array<{
    trialName: string;
    taskName: string;
    reward: number | null;
    costUsd: number | null;
    durationSec: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    error: string | null;
  }>;
};

export type CompareReport = {
  withCards: VariantMetrics;
  withoutCards: VariantMetrics;
  delta: {
    meanCostUsd: number | null;
    meanDurationSec: number | null;
    meanReward: number | null;
    meanInputTokens: number | null;
    meanOutputTokens: number | null;
  };
};

function durationSec(timing?: TimingInfo | null, fallback?: TimingInfo | null): number | null {
  const start = timing?.started_at ?? fallback?.started_at;
  const end = timing?.finished_at ?? fallback?.finished_at;
  if (!start || !end) return null;
  const ms = Date.parse(end) - Date.parse(start);
  if (!Number.isFinite(ms)) return null;
  return ms / 1000;
}

function primaryReward(verifier?: VerifierResult | null): number | null {
  const rewards = verifier?.rewards;
  if (!rewards) return null;
  if (typeof rewards.reward === "number") return rewards.reward;
  const values = Object.values(rewards).filter((v): v is number => typeof v === "number");
  if (values.length === 0) return null;
  return values[0]!;
}

function mean(nums: Array<number | null | undefined>): number | null {
  const xs = nums.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function delta(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return a - b;
}

/** Extract comparable metrics from one Harbor trial `result.json`. */
export function metricsFromTrial(trial: TrialResult): VariantMetrics["trials"][number] {
  return {
    trialName: trial.trial_name ?? "unknown",
    taskName: trial.task_name ?? "unknown",
    reward: primaryReward(trial.verifier_result),
    costUsd: trial.agent_result?.cost_usd ?? null,
    durationSec: durationSec(trial.agent_execution, {
      started_at: trial.started_at,
      finished_at: trial.finished_at,
    }),
    inputTokens: trial.agent_result?.n_input_tokens ?? null,
    outputTokens: trial.agent_result?.n_output_tokens ?? null,
    error: trial.exception_info?.exception_type
      ? `${trial.exception_info.exception_type}: ${trial.exception_info.exception_message ?? ""}`
      : null,
  };
}

/** Aggregate trial metrics for one A/B arm. */
export function aggregateVariant(
  variant: string,
  jobDir: string,
  trials: TrialResult[],
): VariantMetrics {
  const rows = trials.map(metricsFromTrial);
  return {
    variant,
    jobDir,
    nTrials: rows.length,
    nErrors: rows.filter((r) => r.error).length,
    meanReward: mean(rows.map((r) => r.reward)),
    meanCostUsd: mean(rows.map((r) => r.costUsd)),
    meanDurationSec: mean(rows.map((r) => r.durationSec)),
    meanInputTokens: mean(rows.map((r) => r.inputTokens)),
    meanOutputTokens: mean(rows.map((r) => r.outputTokens)),
    trials: rows,
  };
}

/** Compare with-cards vs without-cards aggregates (delta = with − without). */
export function compareVariants(
  withCards: VariantMetrics,
  withoutCards: VariantMetrics,
): CompareReport {
  return {
    withCards,
    withoutCards,
    delta: {
      meanCostUsd: delta(withCards.meanCostUsd, withoutCards.meanCostUsd),
      meanDurationSec: delta(withCards.meanDurationSec, withoutCards.meanDurationSec),
      meanReward: delta(withCards.meanReward, withoutCards.meanReward),
      meanInputTokens: delta(withCards.meanInputTokens, withoutCards.meanInputTokens),
      meanOutputTokens: delta(withCards.meanOutputTokens, withoutCards.meanOutputTokens),
    },
  };
}

function fmt(n: number | null, digits = 4): string {
  if (n === null) return "—";
  return n.toFixed(digits);
}

/** Human-readable A/B table for stdout. */
export function formatCompareReport(report: CompareReport): string {
  const rows = [
    ["variant", "reward", "cost_usd", "duration_s", "input_tok", "output_tok", "errors"],
    [
      "with-cards",
      fmt(report.withCards.meanReward, 3),
      fmt(report.withCards.meanCostUsd),
      fmt(report.withCards.meanDurationSec, 1),
      fmt(report.withCards.meanInputTokens, 0),
      fmt(report.withCards.meanOutputTokens, 0),
      String(report.withCards.nErrors),
    ],
    [
      "without-cards",
      fmt(report.withoutCards.meanReward, 3),
      fmt(report.withoutCards.meanCostUsd),
      fmt(report.withoutCards.meanDurationSec, 1),
      fmt(report.withoutCards.meanInputTokens, 0),
      fmt(report.withoutCards.meanOutputTokens, 0),
      String(report.withoutCards.nErrors),
    ],
    [
      "delta (with−without)",
      fmt(report.delta.meanReward, 3),
      fmt(report.delta.meanCostUsd),
      fmt(report.delta.meanDurationSec, 1),
      fmt(report.delta.meanInputTokens, 0),
      fmt(report.delta.meanOutputTokens, 0),
      "—",
    ],
  ];

  const widths = rows[0]!.map((_, i) => Math.max(...rows.map((r) => r[i]!.length)));
  const line = (r: string[]) =>
    r.map((cell, i) => cell.padEnd(widths[i]!)).join("  ");

  return [
    "Knowledge cards A/B (Harbor)",
    `with:    ${report.withCards.jobDir}  (n=${report.withCards.nTrials})`,
    `without: ${report.withoutCards.jobDir}  (n=${report.withoutCards.nTrials})`,
    "",
    line(rows[0]!),
    line(rows[0]!.map((c) => "-".repeat(c.length))),
    ...rows.slice(1).map(line),
    "",
    "Negative cost/duration delta means with-cards was cheaper/faster.",
  ].join("\n");
}
