/**
 * Run Harbor A/B: same task with vs without knowledge cards.
 *
 * Requires: `harbor` on PATH, Docker (or another Harbor env provider),
 * and API credentials for the chosen agent/model.
 *
 * Usage:
 *   bun run eval/run.ts -- --task repo-map
 *   bun run eval/run.ts -- --task payments-cents --agent oracle
 *   bun run eval/run.ts -- --task repo-map --model openai/gpt-5.6-luna
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareJobDirs } from "./compare.ts";
import { formatCompareReport } from "./metrics.ts";
import { prepareHarborDataset, type TaskPair } from "./prepare.ts";

const EVAL_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_JOBS = join(EVAL_DIR, "jobs");
/** Default Harbor agent for LLM A/B runs. */
export const DEFAULT_EVAL_AGENT = "terminus-2";
/** Default model: GPT-5.6 Luna (Harbor/OpenAI id). */
export const DEFAULT_EVAL_MODEL = "openai/gpt-5.6-luna";
/** Default task optimized for cost/time savings (solvable both arms). */
export const DEFAULT_EVAL_TASK = "repo-map";

type RunOpts = {
  agent: string;
  model?: string;
  taskIds: string[];
  jobsDir: string;
  nAttempts: number;
  harborExtra: string[];
  dryPrepare: boolean;
};

function parseArgs(argv: string[]): RunOpts {
  let agent = DEFAULT_EVAL_AGENT;
  let model: string | undefined = DEFAULT_EVAL_MODEL;
  let jobsDir = DEFAULT_JOBS;
  let nAttempts = 1;
  let dryPrepare = false;
  const taskIds: string[] = [];
  const harborExtra: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--agent" || a === "-a") {
      agent = argv[++i] ?? agent;
      if (agent === "oracle" && model === DEFAULT_EVAL_MODEL) {
        model = undefined;
      }
    } else if (a === "--model" || a === "-m") {
      model = argv[++i];
    } else if (a === "--task" || a === "-t") {
      const id = argv[++i];
      if (id) taskIds.push(id);
    } else if (a === "--jobs-dir" || a === "-o") {
      jobsDir = argv[++i] ?? jobsDir;
    } else if (a === "--n-attempts" || a === "-k") {
      nAttempts = Number(argv[++i] ?? 1);
    } else if (a === "--prepare-only") {
      dryPrepare = true;
    } else if (a === "--") {
      harborExtra.push(...argv.slice(i + 1));
      break;
    } else {
      harborExtra.push(a);
    }
  }

  return {
    agent,
    model,
    taskIds: taskIds.length ? taskIds : [DEFAULT_EVAL_TASK],
    jobsDir,
    nAttempts,
    harborExtra,
    dryPrepare,
  };
}

async function findNewestJobDir(jobsDir: string, prefix: string): Promise<string> {
  const glob = new Bun.Glob(`${prefix}*`);
  const matches: string[] = [];
  for await (const name of glob.scan({ cwd: jobsDir, onlyFiles: false })) {
    matches.push(name);
  }
  if (matches.length === 0) {
    throw new Error(`No job dirs matching ${prefix}* under ${jobsDir}`);
  }
  matches.sort();
  return join(jobsDir, matches[matches.length - 1]!);
}

async function harborRun(opts: {
  taskPath: string;
  jobName: string;
  jobsDir: string;
  agent: string;
  model?: string;
  nAttempts: number;
  extra: string[];
}): Promise<string> {
  const args = [
    "run",
    "-p",
    opts.taskPath,
    "-a",
    opts.agent,
    "-o",
    opts.jobsDir,
    "--job-name",
    opts.jobName,
    "-k",
    String(opts.nAttempts),
    "-y",
  ];
  if (opts.model) {
    args.push("-m", opts.model);
  }
  args.push(...opts.extra);

  console.log(`\n$ harbor ${args.join(" ")}`);
  const proc = Bun.spawn(["harbor", ...args], {
    cwd: EVAL_DIR,
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`harbor run failed with exit ${code} (job ${opts.jobName})`);
  }
  return findNewestJobDir(opts.jobsDir, opts.jobName);
}

async function runTaskPair(
  pair: TaskPair,
  opts: RunOpts,
  stamp: string,
): Promise<string> {
  const withJobName = `kc-${pair.taskId}-with-${stamp}`;
  const withoutJobName = `kc-${pair.taskId}-without-${stamp}`;

  const withJobDir = await harborRun({
    taskPath: pair.withCards,
    jobName: withJobName,
    jobsDir: opts.jobsDir,
    agent: opts.agent,
    model: opts.model,
    nAttempts: opts.nAttempts,
    extra: opts.harborExtra,
  });

  const withoutJobDir = await harborRun({
    taskPath: pair.withoutCards,
    jobName: withoutJobName,
    jobsDir: opts.jobsDir,
    agent: opts.agent,
    model: opts.model,
    nAttempts: opts.nAttempts,
    extra: opts.harborExtra,
  });

  const report = await compareJobDirs(withJobDir, withoutJobDir);
  console.log(`\n=== ${pair.taskId} ===`);
  console.log(formatCompareReport(report));

  const outPath = join(opts.jobsDir, `ab-compare-${pair.taskId}-${stamp}.json`);
  await Bun.write(outPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nWrote ${outPath}`);
  return outPath;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const { datasetDir, tasks } = await prepareHarborDataset(opts.taskIds);
  console.log(`Dataset ready: ${datasetDir}`);
  console.log(`Tasks: ${tasks.map((t) => t.taskId).join(", ")}`);
  console.log(`Agent/model: ${opts.agent}${opts.model ? ` / ${opts.model}` : ""}`);

  if (opts.dryPrepare) {
    console.log("prepare-only: skipping harbor run");
    return;
  }

  await mkdir(opts.jobsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  for (const pair of tasks) {
    await runTaskPair(pair, opts, stamp);
  }
}

if (import.meta.main) {
  await main();
}
