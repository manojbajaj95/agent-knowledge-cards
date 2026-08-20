/**
 * Materialize Harbor tasks for knowcards A/B evals.
 *
 * Templates live in eval/templates/<task-id>/. Instruction, tests, solution,
 * and the SWE-bench Dockerfile come from Harbor's official
 * swe-bench/swe-bench-verified tasks. Seed cards use production layout:
 * cards/<notebook-id>/*.md
 *
 * Each template becomes one Harbor task (same instruction/env/tests for both
 * arms). Arms differ only at harbor-run time (bare Pi vs Pi + extension + CLI).
 * Prepare appends a Node+Pi bake to the official Dockerfile and sets
 * skills_dir. Seed cards land in seed_cards/ (outside environment/) so they
 * are not in the Docker image. Each task keeps exactly one seed card. The
 * with-arm bind-mounts seed_cards/ at /testbed/.agents/knowledge_cards;
 * without has none. environment/ never gets .agents or AGENTS.md.
 *   eval/harbor/<task-id>/
 *   eval/harbor/knowcards.tgz  (npm pack of this repo after build)
 */
import {
  chmod,
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openLibrary } from "../src/core/storage.ts";
import { allCards, type KnowledgeCard } from "../src/core/types/index.ts";

const EVAL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(EVAL_DIR);
const TEMPLATES_DIR = join(EVAL_DIR, "templates");
const HARBOR_DIR = join(EVAL_DIR, "harbor");
/** Seed cards outside environment/ so Docker build does not bake them in. */
export const SEED_CARDS_REL = "seed_cards";
export const KNOWCARDS_TGZ = join(HARBOR_DIR, "knowcards.tgz");
/** In-container path where the with-arm mounts SEED_CARDS_REL. */
export const CONTAINER_CARDS_ROOT = "/testbed/.agents/knowledge_cards";
/** Baked into each task image. Keep in sync with eval/run.ts. */
export const EVAL_PI_VERSION = "0.84.2";
const EVAL_NODE_VERSION = "22.19.0";

const PI_BAKE = `
# Knowcards eval: bake Node + Pi. Keep PI_VERSION in sync with eval/run.ts.
ARG PI_VERSION=${EVAL_PI_VERSION}
ARG NODE_VERSION=${EVAL_NODE_VERSION}
ARG TARGETARCH
RUN apt-get update \\
  && apt-get install -y --no-install-recommends ca-certificates curl xz-utils \\
  && ARCH="$(case "\${TARGETARCH}" in amd64) echo x64 ;; arm64) echo arm64 ;; *) echo x64 ;; esac)" \\
  && curl -fsSL "https://nodejs.org/dist/v\${NODE_VERSION}/node-v\${NODE_VERSION}-linux-\${ARCH}.tar.xz" \\
    | tar -xJ -C /usr/local --strip-components=1 \\
  && npm install -g --ignore-scripts "@earendil-works/pi-coding-agent@\${PI_VERSION}" \\
  && pi --version \\
  && rm -rf /var/lib/apt/lists/*
`;

function bakePiIntoDockerfile(text: string): string {
  if (text.includes("@earendil-works/pi-coding-agent@")) return text;
  return `${text.trimEnd()}\n${PI_BAKE}`;
}

function ensureSkillsDir(toml: string): string {
  if (/skills_dir\s*=/.test(toml)) return toml;
  const marker = "\n[environment]\n";
  const idx = toml.indexOf(marker);
  if (idx === -1) {
    return `${toml.trimEnd()}\n[environment]\nskills_dir = "/skills"\n`;
  }
  const insertAt = idx + marker.length;
  return `${toml.slice(0, insertAt)}skills_dir = "/skills"\n${toml.slice(insertAt)}`;
}

export type PreparedTask = {
  taskId: string;
  taskPath: string;
  /** Absolute path to prepared seed_cards/ (host; mounted only on with-arm). */
  seedCardsPath: string;
};

export type PrepareResult = {
  datasetDir: string;
  knowcardsTgz: string;
  tasks: PreparedTask[];
};

async function listTemplateIds(): Promise<string[]> {
  const entries = await readdir(TEMPLATES_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** Load seed cards via FsCardStorage layout (cards/<notebook>/*.md). */
export async function loadTemplateCards(
  templateDir: string,
): Promise<KnowledgeCard[]> {
  const cardsRoot = join(templateDir, "cards");
  const { library } = await openLibrary(cardsRoot);
  return allCards(library);
}

async function copyTree(src: string, dest: string): Promise<void> {
  await rm(dest, { recursive: true, force: true });
  await mkdir(dirname(dest), { recursive: true });
  await cp(src, dest, { recursive: true });
}

/** Drop old with/without-cards forks left from earlier prepare layouts. */
async function removeStaleHarborForks(): Promise<void> {
  let entries: Array<{ isDirectory(): boolean; name: string }>;
  try {
    entries = await readdir(HARBOR_DIR, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.endsWith("-with-cards") || e.name.endsWith("-without-cards")) {
      await rm(join(HARBOR_DIR, e.name), { recursive: true, force: true });
    }
  }
}

async function writeTask(opts: {
  taskId: string;
  templateDir: string;
}): Promise<string> {
  const dest = join(HARBOR_DIR, opts.taskId);
  await copyTree(opts.templateDir, dest);

  await rm(join(dest, "instruction.base.md"), { force: true });
  await rm(join(dest, "cards"), { recursive: true, force: true });
  // Cards and AGENTS hints must not live in the Docker build context.
  await rm(join(dest, "environment", ".agents"), {
    recursive: true,
    force: true,
  });
  await rm(join(dest, "environment", "AGENTS.md"), { force: true });

  const base = await readFile(
    join(opts.templateDir, "instruction.base.md"),
    "utf8",
  );
  await writeFile(join(dest, "instruction.md"), `${base.trimEnd()}\n`, "utf8");

  const cardsSrc = join(opts.templateDir, "cards");
  const cardsDest = join(dest, SEED_CARDS_REL);
  await rm(cardsDest, { recursive: true, force: true });
  await cp(cardsSrc, cardsDest, { recursive: true });

  const toml = ensureSkillsDir(
    (await readFile(join(opts.templateDir, "task.toml"), "utf8"))
      .replaceAll("{{TASK_NAME}}", opts.taskId)
      .replaceAll("{{VARIANT}}", "ab"),
  );
  await writeFile(join(dest, "task.toml"), toml, "utf8");

  const dockerfilePath = join(dest, "environment", "Dockerfile");
  await writeFile(
    dockerfilePath,
    bakePiIntoDockerfile(await readFile(dockerfilePath, "utf8")),
    "utf8",
  );

  await chmod(join(dest, "solution", "solve.sh"), 0o755);
  await chmod(join(dest, "tests", "test.sh"), 0o755);
  return dest;
}

/** Build dist/ and npm-pack into eval/harbor/knowcards.tgz. */
export async function packKnowcardsTgz(): Promise<string> {
  await mkdir(HARBOR_DIR, { recursive: true });

  const build = Bun.spawn(["bun", "run", "build"], {
    cwd: REPO_ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await build.exited) !== 0) {
    throw new Error("bun run build failed before npm pack");
  }

  const pack = Bun.spawn(["npm", "pack", "--pack-destination", HARBOR_DIR], {
    cwd: REPO_ROOT,
    stdout: "pipe",
    stderr: "inherit",
  });
  const packOut = await new Response(pack.stdout).text();
  if ((await pack.exited) !== 0) {
    throw new Error("npm pack failed");
  }

  const packedName = packOut.trim().split("\n").pop()?.trim();
  if (!packedName) {
    throw new Error("npm pack produced no filename");
  }
  const packedPath = join(HARBOR_DIR, packedName);
  if (packedPath !== KNOWCARDS_TGZ) {
    await rm(KNOWCARDS_TGZ, { force: true });
    await rename(packedPath, KNOWCARDS_TGZ);
  }
  return KNOWCARDS_TGZ;
}

/** Prepare one or more task templates into eval/harbor/. */
export async function prepareHarborDataset(
  taskIds?: string[],
  opts?: { pack?: boolean },
): Promise<PrepareResult> {
  const available = await listTemplateIds();
  const selected = taskIds?.length ? taskIds : available;

  for (const id of selected) {
    if (!available.includes(id)) {
      throw new Error(
        `Unknown task template "${id}". Available: ${available.join(", ")}`,
      );
    }
  }

  await mkdir(HARBOR_DIR, { recursive: true });
  await removeStaleHarborForks();
  const tasks: PreparedTask[] = [];

  for (const taskId of selected) {
    const templateDir = join(TEMPLATES_DIR, taskId);
    const cards = await loadTemplateCards(templateDir);
    if (cards.length === 0) {
      throw new Error(`No cards in ${join(templateDir, "cards")}`);
    }
    if (cards.length !== 1) {
      throw new Error(
        `Expected exactly one seed card for "${taskId}", found ${cards.length} in ${join(templateDir, "cards")}`,
      );
    }
    const taskPath = await writeTask({ taskId, templateDir });
    tasks.push({
      taskId,
      taskPath,
      seedCardsPath: join(taskPath, SEED_CARDS_REL),
    });
  }

  let knowcardsTgz = KNOWCARDS_TGZ;
  if (opts?.pack !== false) {
    knowcardsTgz = await packKnowcardsTgz();
  }

  return { datasetDir: HARBOR_DIR, knowcardsTgz, tasks };
}

async function main(): Promise<void> {
  const taskIds = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const { datasetDir, knowcardsTgz, tasks } = await prepareHarborDataset(
    taskIds.length ? taskIds : undefined,
  );
  console.log(`Prepared Harbor dataset at ${datasetDir}`);
  console.log(`  knowcards.tgz: ${knowcardsTgz}`);
  for (const t of tasks) {
    console.log(`  ${t.taskId}: ${t.taskPath}`);
  }
}

if (import.meta.main) {
  await main();
}
