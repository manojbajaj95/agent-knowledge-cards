#!/usr/bin/env node
import { createRequire } from "node:module";
import { Command } from "commander";
import { proposeCard } from "../core/ingestion.ts";
import { queryLibrary } from "../core/retrieval.ts";
import {
  FsCardStorage,
  openLibrary,
  requireNotebook,
} from "../core/storage.ts";
import {
  allCards,
  DEFAULT_CARDS_ROOT,
  DEFAULT_NOTEBOOK_ID,
} from "../core/types/index.ts";

const pkg = createRequire(import.meta.url)("../../package.json") as {
  version: string;
};

const program = new Command();

program
  .name("knowcards")
  .description("knowledge cards CLI")
  .version(pkg.version)
  .option("--root <dir>", "cards root directory", DEFAULT_CARDS_ROOT)
  .showHelpAfterError();

program
  .command("init", { hidden: true })
  .description(
    "ensure cards root and default notebook (optional; propose also creates dirs)",
  )
  .action(async (_opts, cmd) => {
    const { root } = cmd.optsWithGlobals() as { root: string };
    const storage = new FsCardStorage(root);
    await storage.init();
    console.log(
      JSON.stringify(
        { root, notebook: DEFAULT_NOTEBOOK_ID, initialized: true },
        null,
        2,
      ),
    );
  });

program
  .command("status")
  .description("show notebooks and card counts (loads library into memory)")
  .action(async (_opts, cmd) => {
    const { root } = cmd.optsWithGlobals() as { root: string };
    const { library } = await openLibrary(root);
    console.log(
      JSON.stringify(
        {
          root: library.root,
          notebooks: library.notebooks.map((n) => ({
            id: n.id,
            count: n.cards.length,
          })),
          totalCards: allCards(library).length,
        },
        null,
        2,
      ),
    );
  });

program
  .command("query")
  .description("query cards with MiniSearch BM25+ (empty = all)")
  .argument("[q]", "search query (empty = all cards)", "")
  .option("--notebook <id>", "limit to one notebook")
  .action(async (q: string, opts: { notebook?: string }, cmd) => {
    const { root } = cmd.optsWithGlobals() as { root: string };
    const { library } = await openLibrary(root);
    const cards = queryLibrary(library, q, opts.notebook);
    console.log(JSON.stringify(cards, null, 2));
  });

program
  .command("propose")
  .description("propose a card (title required; filename slugified from title)")
  .requiredOption("--title <text>", "card title")
  .option("--use-when <text>", "optional use-when hint")
  .option("--notebook <id>", "notebook id", DEFAULT_NOTEBOOK_ID)
  .argument("[body...]", "card body (defaults to title)")
  .action(
    async (
      bodyParts: string[],
      opts: { title: string; useWhen?: string; notebook: string },
      cmd,
    ) => {
      const { root } = cmd.optsWithGlobals() as { root: string };
      const { storage, library } = await openLibrary(root);
      // writeCard mkdir -p; no explicit init required
      const body = bodyParts.join(" ").trim() || undefined;
      const nb = requireNotebook(library, opts.notebook);
      const { card } = proposeCard(nb, {
        title: opts.title,
        body,
        useWhen: opts.useWhen,
      });
      await storage.writeCard(opts.notebook, card);
      console.log(JSON.stringify(card, null, 2));
    },
  );

program
  .command("install")
  .description(
    "install session hooks for a host (claude-code | cursor | codex)",
  )
  .argument("<host>", "claude-code | cursor | codex")
  .action(async (hostArg: string) => {
    const host = hostArg.trim().toLowerCase();
    if (host !== "claude-code" && host !== "cursor" && host !== "codex") {
      console.error(
        `Unknown host "${hostArg}". Use: claude-code | cursor | codex`,
      );
      process.exitCode = 1;
      return;
    }
    const { installHost } = await import("./install.ts");
    const result = await installHost(host);
    console.log(
      JSON.stringify(
        {
          installed: result.host,
          files: result.files,
          notes: result.notes,
        },
        null,
        2,
      ),
    );
  });

program
  .command("mcp")
  .description("run the knowledge cards MCP server over stdio")
  .action(async () => {
    const { startMcpStdio } = await import("../mcp/stdio.ts");
    await startMcpStdio();
  });

await program.parseAsync(process.argv);
