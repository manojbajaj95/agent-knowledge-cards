/**
 * Materialize Harbor tasks for with/without knowledge-cards A/B evals.
 *
 * Templates live in eval/templates/<task-id>/. Seed cards use the same
 * filesystem layout as production: cards/<notebook-id>/*.md
 * (default notebook under cards/default/).
 *
 * Each template becomes two Harbor tasks:
 *   eval/harbor/<task-id>-with-cards
 *   eval/harbor/<task-id>-without-cards
 */
import { chmod, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatCardsForInject } from "../src/core/inject.ts";
import { openLibrary } from "../src/core/storage.ts";
import { allCards, type KnowledgeCard } from "../src/core/types/index.ts";

const EVAL_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(EVAL_DIR, "templates");
const HARBOR_DIR = join(EVAL_DIR, "harbor");

export type TaskPair = {
  taskId: string;
  withCards: string;
  withoutCards: string;
};

export type PrepareResult = {
  datasetDir: string;
  tasks: TaskPair[];
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

async function writeTask(opts: {
  taskId: string;
  templateDir: string;
  variant: "with-cards" | "without-cards";
  cards: KnowledgeCard[];
}): Promise<string> {
  const name = `${opts.taskId}-${opts.variant}`;
  const dest = join(HARBOR_DIR, name);
  await copyTree(opts.templateDir, dest);

  await rm(join(dest, "instruction.base.md"), { force: true });
  await rm(join(dest, "cards"), { recursive: true, force: true });

  const base = await readFile(join(opts.templateDir, "instruction.base.md"), "utf8");
  let instruction = base.trimEnd() + "\n";
  if (opts.variant === "with-cards") {
    instruction +=
      "\n## Trusted memory (knowledge cards)\n\n" +
      formatCardsForInject(opts.cards).trimEnd() +
      "\n";
  }
  await writeFile(join(dest, "instruction.md"), instruction, "utf8");

  const toml = (await readFile(join(opts.templateDir, "task.toml"), "utf8"))
    .replaceAll("{{TASK_NAME}}", name)
    .replaceAll("{{VARIANT}}", opts.variant);
  await writeFile(join(dest, "task.toml"), toml, "utf8");

  await chmod(join(dest, "solution", "solve.sh"), 0o755);
  await chmod(join(dest, "tests", "test.sh"), 0o755);
  return dest;
}

/** Prepare one or more task templates into eval/harbor/. */
export async function prepareHarborDataset(
  taskIds?: string[],
): Promise<PrepareResult> {
  const available = await listTemplateIds();
  const selected = taskIds?.length ? taskIds : available;

  for (const id of selected) {
    if (!available.includes(id)) {
      throw new Error(`Unknown task template "${id}". Available: ${available.join(", ")}`);
    }
  }

  await mkdir(HARBOR_DIR, { recursive: true });
  const tasks: TaskPair[] = [];

  for (const taskId of selected) {
    const templateDir = join(TEMPLATES_DIR, taskId);
    const cards = await loadTemplateCards(templateDir);
    if (cards.length === 0) {
      throw new Error(`No cards in ${join(templateDir, "cards")}`);
    }
    const withCards = await writeTask({
      taskId,
      templateDir,
      variant: "with-cards",
      cards,
    });
    const withoutCards = await writeTask({
      taskId,
      templateDir,
      variant: "without-cards",
      cards: [],
    });
    tasks.push({ taskId, withCards, withoutCards });
  }

  return { datasetDir: HARBOR_DIR, tasks };
}

async function main(): Promise<void> {
  const taskIds = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const { datasetDir, tasks } = await prepareHarborDataset(
    taskIds.length ? taskIds : undefined,
  );
  console.log(`Prepared Harbor dataset at ${datasetDir}`);
  for (const t of tasks) {
    console.log(`  ${t.taskId}`);
    console.log(`    with-cards:    ${t.withCards}`);
    console.log(`    without-cards: ${t.withoutCards}`);
  }
}

if (import.meta.main) {
  await main();
}
