#!/usr/bin/env bun
import { resolve } from "node:path";
import { proposeCard } from "../core/ingestion.ts";
import { reflect } from "../core/reflection.ts";
import { queryCards } from "../core/retrieval.ts";
import { loadNotebook, saveNotebook } from "../core/storage.ts";
import { DEFAULT_NOTEBOOK_PATH } from "../core/types.ts";

function usage(): never {
  console.log(`kc — knowledge cards CLI

Usage:
  kc status [--path <notebook.json>]
  kc query [q] [--path <notebook.json>]
  kc propose <text> [--path <notebook.json>]
  kc reflect --episode <file> [--path <notebook.json>]
`);
  process.exit(1);
}

function getFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

function notebookPath(args: string[]): string {
  return getFlag(args, "--path") ?? DEFAULT_NOTEBOOK_PATH;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (!cmd) usage();

  const path = notebookPath(args);

  if (cmd === "status") {
    const nb = await loadNotebook(path);
    console.log(JSON.stringify({ path, count: nb.cards.length }, null, 2));
    return;
  }

  if (cmd === "query") {
    const positionals = args.slice(1).filter((a, i, arr) => {
      if (a.startsWith("--")) return false;
      if (arr[i - 1] === "--path") return false;
      return true;
    });
    const query = positionals[0] ?? "";
    const nb = await loadNotebook(path);
    console.log(JSON.stringify(queryCards(nb, query), null, 2));
    return;
  }

  if (cmd === "propose") {
    const positionals = args.slice(1).filter((a, i, arr) => {
      if (a.startsWith("--")) return false;
      if (arr[i - 1] === "--path") return false;
      return true;
    });
    const text = positionals.join(" ").trim();
    if (!text) usage();
    const nb = await loadNotebook(path);
    const next = proposeCard(nb, text);
    await saveNotebook(next, path);
    const added = next.cards[next.cards.length - 1];
    console.log(JSON.stringify(added, null, 2));
    return;
  }

  if (cmd === "reflect") {
    const episodePath = getFlag(args, "--episode");
    if (!episodePath) usage();
    const text = await Bun.file(resolve(episodePath)).text();
    const nb = await loadNotebook(path);
    const next = reflect(nb, { text });
    await saveNotebook(next, path);
    console.log(JSON.stringify({ path, count: next.cards.length }, null, 2));
    return;
  }

  usage();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
