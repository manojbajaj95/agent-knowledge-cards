/**
 * Compare Harbor job dirs from with-cards vs without-cards arms.
 *
 * Usage:
 *   bun run eval/compare.ts --with <jobDir> --without <jobDir> [--out report.json]
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  aggregateVariant,
  compareVariants,
  formatCompareReport,
  type TrialResult,
} from "./metrics.ts";

function isTrialResult(json: unknown): json is TrialResult {
  if (!json || typeof json !== "object") return false;
  const o = json as Record<string, unknown>;
  return (
    typeof o.task_name === "string" ||
    o.agent_result != null ||
    o.agent_execution != null ||
    o.verifier_result != null
  );
}

async function collectTrialResults(jobDir: string): Promise<TrialResult[]> {
  const trials: TrialResult[] = [];
  const entries = await readdir(jobDir, { withFileTypes: true });

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const resultPath = join(jobDir, ent.name, "result.json");
    const file = Bun.file(resultPath);
    if (!(await file.exists())) continue;
    const json: unknown = await file.json();
    if (isTrialResult(json)) trials.push(json);
  }

  if (trials.length === 0) {
    const bare = Bun.file(join(jobDir, "result.json"));
    if (await bare.exists()) {
      const json: unknown = await bare.json();
      if (isTrialResult(json)) trials.push(json);
    }
  }

  if (trials.length === 0) {
    throw new Error(`No trial result.json files found under ${jobDir}`);
  }
  return trials;
}

export async function compareJobDirs(
  withJobDir: string,
  withoutJobDir: string,
) {
  const withTrials = await collectTrialResults(withJobDir);
  const withoutTrials = await collectTrialResults(withoutJobDir);
  return compareVariants(
    aggregateVariant("with-cards", withJobDir, withTrials),
    aggregateVariant("without-cards", withoutJobDir, withoutTrials),
  );
}

function parseArgs(argv: string[]): {
  withDir: string;
  withoutDir: string;
  outPath?: string;
} {
  let withDir: string | undefined;
  let withoutDir: string | undefined;
  let outPath: string | undefined;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--with") withDir = argv[++i];
    else if (a === "--without") withoutDir = argv[++i];
    else if (a === "--out") outPath = argv[++i];
    else positional.push(a);
  }

  withDir ??= positional[0];
  withoutDir ??= positional[1];
  if (!withDir || !withoutDir) {
    throw new Error(
      "Usage: bun run eval/compare.ts --with <jobDir> --without <jobDir> [--out report.json]",
    );
  }
  return { withDir, withoutDir, outPath };
}

async function main(): Promise<void> {
  const { withDir, withoutDir, outPath } = parseArgs(process.argv.slice(2));
  const report = await compareJobDirs(withDir, withoutDir);
  console.log(formatCompareReport(report));
  if (outPath) {
    await Bun.write(outPath, JSON.stringify(report, null, 2) + "\n");
    console.log(`\nWrote ${outPath}`);
  }
}

if (import.meta.main) {
  await main();
}
