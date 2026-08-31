/**
 * Run Harbor A/B: same task with vs without knowcards (extension + CLI).
 *
 * Requires: `harbor` on PATH, Docker (or another Harbor env provider),
 * and API credentials for the chosen agent/model.
 *
 * Usage:
 *   bun run eval/run.ts -- --task pytest-dev__pytest-10051
 *   bun run eval/run.ts -- --task pytest-dev__pytest-10051 --agent oracle
 *   bun run eval/run.ts -- --model openai/gpt-5.6-luna
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareJobDirs } from "./compare.ts";
import { formatCompareReport } from "./metrics.ts";
import {
  CONTAINER_CARDS_ROOT,
  EVAL_PI_VERSION,
  KNOWCARDS_TGZ,
  type PreparedTask,
  prepareHarborDataset,
} from "./prepare.ts";

const EVAL_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_JOBS = join(EVAL_DIR, "jobs");
/** Default Harbor agent for LLM A/B runs (pinned barebones Pi). */
export const DEFAULT_EVAL_AGENT = "pi";
/** Pinned Pi npm package version (`@earendil-works/pi-coding-agent`). */
export const DEFAULT_PI_VERSION = EVAL_PI_VERSION;
/** Default model: GPT-5.6 Luna (Harbor/OpenAI id). */
export const DEFAULT_EVAL_MODEL = "openai/gpt-5.6-luna";

const HARBOR_PI_BARE = "harbor_pi:PiBare";
const HARBOR_PI_WITH = "harbor_pi:PiWithKnowcards";

type RunOpts = {
  agent: string;
  model?: string;
  taskIds: string[];
  jobsDir: string;
  nAttempts: number;
  piVersion: string;
  harborExtra: string[];
  dryPrepare: boolean;
};

function parseArgs(argv: string[]): RunOpts {
  let agent = DEFAULT_EVAL_AGENT;
  let model: string | undefined = DEFAULT_EVAL_MODEL;
  let jobsDir = DEFAULT_JOBS;
  let nAttempts = 1;
  let piVersion = DEFAULT_PI_VERSION;
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
    } else if (a === "--pi-version") {
      piVersion = argv[++i] ?? piVersion;
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
    taskIds,
    jobsDir,
    nAttempts,
    piVersion,
    harborExtra,
    dryPrepare,
  };
}

async function findNewestJobDir(
  jobsDir: string,
  prefix: string,
): Promise<string> {
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

type HarborArm = "with-knowcards" | "without-knowcards";

async function harborRun(opts: {
  taskPath: string;
  jobName: string;
  jobsDir: string;
  agent: string;
  model?: string;
  nAttempts: number;
  piVersion: string;
  arm: HarborArm;
  knowcardsTgz: string;
  seedCardsPath: string;
  extra: string[];
}): Promise<string> {
  const args: string[] = [
    "run",
    "-p",
    opts.taskPath,
    "-o",
    opts.jobsDir,
    "--job-name",
    opts.jobName,
    "-k",
    String(opts.nAttempts),
    "-y",
  ];

  if (opts.agent === "oracle") {
    args.push("-a", "oracle");
  } else if (opts.arm === "with-knowcards") {
    args.push(
      "-a",
      HARBOR_PI_WITH,
      "--ak",
      `version=${opts.piVersion}`,
      "--mounts",
      JSON.stringify([
        {
          type: "bind",
          source: opts.knowcardsTgz,
          target: "/opt/knowcards.tgz",
        },
        {
          type: "bind",
          source: opts.seedCardsPath,
          target: CONTAINER_CARDS_ROOT,
        },
      ]),
    );
    if (opts.model) args.push("-m", opts.model);
  } else {
    args.push("-a", HARBOR_PI_BARE, "--ak", `version=${opts.piVersion}`);
    if (opts.model) args.push("-m", opts.model);
  }

  args.push(...opts.extra);

  console.log(`\n$ harbor ${args.join(" ")}`);
  const proc = Bun.spawn(["harbor", ...args], {
    cwd: EVAL_DIR,
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      PYTHONPATH: [EVAL_DIR, process.env.PYTHONPATH].filter(Boolean).join(":"),
    },
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(
      `harbor run failed with exit ${code} (job ${opts.jobName})`,
    );
  }
  return findNewestJobDir(opts.jobsDir, opts.jobName);
}

async function runOracleSanity(
  task: PreparedTask,
  opts: RunOpts,
  stamp: string,
): Promise<void> {
  const jobName = `kc-${task.taskId}-oracle-${stamp}`;
  await harborRun({
    taskPath: task.taskPath,
    jobName,
    jobsDir: opts.jobsDir,
    agent: "oracle",
    model: undefined,
    nAttempts: opts.nAttempts,
    piVersion: opts.piVersion,
    arm: "without-knowcards",
    knowcardsTgz: KNOWCARDS_TGZ,
    seedCardsPath: task.seedCardsPath,
    extra: opts.harborExtra,
  });
  console.log(`\nOracle sanity done: ${jobName}`);
}

async function runTaskAb(
  task: PreparedTask,
  opts: RunOpts,
  stamp: string,
  knowcardsTgz: string,
): Promise<string> {
  const withJobName = `kc-${task.taskId}-with-${stamp}`;
  const withoutJobName = `kc-${task.taskId}-without-${stamp}`;

  const withJobDir = await harborRun({
    taskPath: task.taskPath,
    jobName: withJobName,
    jobsDir: opts.jobsDir,
    agent: opts.agent,
    model: opts.model,
    nAttempts: opts.nAttempts,
    piVersion: opts.piVersion,
    arm: "with-knowcards",
    knowcardsTgz,
    seedCardsPath: task.seedCardsPath,
    extra: opts.harborExtra,
  });

  const withoutJobDir = await harborRun({
    taskPath: task.taskPath,
    jobName: withoutJobName,
    jobsDir: opts.jobsDir,
    agent: opts.agent,
    model: opts.model,
    nAttempts: opts.nAttempts,
    piVersion: opts.piVersion,
    arm: "without-knowcards",
    knowcardsTgz,
    seedCardsPath: task.seedCardsPath,
    extra: opts.harborExtra,
  });

  const report = await compareJobDirs(withJobDir, withoutJobDir);
  console.log(`\n=== ${task.taskId} ===`);
  console.log(formatCompareReport(report));

  const outPath = join(opts.jobsDir, `ab-compare-${task.taskId}-${stamp}.json`);
  await Bun.write(outPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nWrote ${outPath}`);
  return outPath;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const { datasetDir, knowcardsTgz, tasks } = await prepareHarborDataset(
    opts.taskIds.length ? opts.taskIds : undefined,
  );
  console.log(`Dataset ready: ${datasetDir}`);
  console.log(`knowcards.tgz: ${knowcardsTgz}`);
  console.log(`Tasks: ${tasks.map((t) => t.taskId).join(", ")}`);
  if (opts.agent === "oracle") {
    console.log("Agent: oracle (single sanity run, no A/B)");
  } else {
    console.log(
      `Agent/model: pi@${opts.piVersion} (@earendil-works) / ${opts.model ?? DEFAULT_EVAL_MODEL}`,
    );
    console.log(
      "Arms: without-knowcards = PiBare; with-knowcards = PiWithKnowcards + extension + CLI",
    );
  }

  if (opts.dryPrepare) {
    console.log("prepare-only: skipping harbor run");
    return;
  }

  await mkdir(opts.jobsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  for (const task of tasks) {
    if (opts.agent === "oracle") {
      await runOracleSanity(task, opts, stamp);
    } else {
      await runTaskAb(task, opts, stamp, knowcardsTgz);
    }
  }
}

if (import.meta.main) {
  await main();
}
