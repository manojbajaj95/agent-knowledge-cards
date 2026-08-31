#!/usr/bin/env node
import { createRequire } from "node:module";
import { Command } from "commander";
import {
  deleteCardOp,
  initCards,
  proposeCardOp,
  queryCardsOp,
  statusCards,
  updateCardOp,
} from "../memory/ops.ts";
import {
  DEFAULT_CARDS_ROOT,
  DEFAULT_NOTEBOOK_ID,
} from "../memory/types/index.ts";

const pkg = createRequire(import.meta.url)("../../package.json") as {
  version: string;
};

function fail(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  console.log(JSON.stringify({ error: message }, null, 2));
  process.exit(1);
}

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
    try {
      console.log(JSON.stringify(await initCards(root), null, 2));
    } catch (err) {
      fail(err);
    }
  });

program
  .command("status")
  .description("show notebooks and card counts (loads library into memory)")
  .action(async (_opts, cmd) => {
    const { root } = cmd.optsWithGlobals() as { root: string };
    try {
      console.log(JSON.stringify(await statusCards(root), null, 2));
    } catch (err) {
      fail(err);
    }
  });

program
  .command("query")
  .description("query cards with MiniSearch BM25+ (empty = all)")
  .argument("[q]", "search query (empty = all cards)", "")
  .option("--notebook <id>", "limit to one notebook")
  .action(async (q: string, opts: { notebook?: string }, cmd) => {
    const { root } = cmd.optsWithGlobals() as { root: string };
    try {
      const cards = await queryCardsOp(q, { root, notebook: opts.notebook });
      console.log(JSON.stringify(cards, null, 2));
    } catch (err) {
      fail(err);
    }
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
      try {
        const body = bodyParts.join(" ").trim() || undefined;
        const card = await proposeCardOp({
          title: opts.title,
          body,
          useWhen: opts.useWhen,
          notebook: opts.notebook,
          root,
        });
        console.log(JSON.stringify(card, null, 2));
      } catch (err) {
        fail(err);
      }
    },
  );

program
  .command("update")
  .description("update a card by id or slug (title change may rename the file)")
  .argument("<id-or-slug>", "card id or slug")
  .option("--title <text>", "new title")
  .option("--use-when <text>", "new use-when hint (empty clears it)")
  .option("--notebook <id>", "notebook id", DEFAULT_NOTEBOOK_ID)
  .argument("[body...]", "new card body")
  .action(
    async (
      idOrSlug: string,
      bodyParts: string[],
      opts: {
        title?: string;
        useWhen?: string;
        notebook: string;
      },
      cmd,
    ) => {
      const { root } = cmd.optsWithGlobals() as { root: string };
      try {
        const body = bodyParts.join(" ").trim();
        const card = await updateCardOp(idOrSlug, {
          title: opts.title,
          body: body || undefined,
          useWhen: opts.useWhen === undefined ? undefined : opts.useWhen,
          notebook: opts.notebook,
          root,
        });
        console.log(JSON.stringify(card, null, 2));
      } catch (err) {
        fail(err);
      }
    },
  );

program
  .command("delete")
  .description("delete a card by id or slug")
  .argument("<id-or-slug>", "card id or slug")
  .option("--notebook <id>", "notebook id", DEFAULT_NOTEBOOK_ID)
  .action(async (idOrSlug: string, opts: { notebook: string }, cmd) => {
    const { root } = cmd.optsWithGlobals() as { root: string };
    try {
      const result = await deleteCardOp(idOrSlug, {
        notebook: opts.notebook,
        root,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      fail(err);
    }
  });

program
  .command("install")
  .description(
    "install session hooks for a host (claude-code | cursor | codex | pi)",
  )
  .argument("<host>", "claude-code | cursor | codex | pi")
  .option(
    "--global",
    "pi only: write ~/.pi/agent/extensions (loaded in print mode)",
  )
  .action(async (hostArg: string, opts: { global?: boolean }) => {
    const host = hostArg.trim().toLowerCase();
    if (
      host !== "claude-code" &&
      host !== "cursor" &&
      host !== "codex" &&
      host !== "pi"
    ) {
      console.error(
        `Unknown host "${hostArg}". Use: claude-code | cursor | codex | pi`,
      );
      process.exitCode = 1;
      return;
    }
    if (opts.global && host !== "pi") {
      console.error('--global is only valid with host "pi"');
      process.exitCode = 1;
      return;
    }
    try {
      const { installHost } = await import("./install.ts");
      const result = await installHost(host, process.cwd(), {
        global: opts.global,
      });
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
    } catch (err) {
      fail(err);
    }
  });

program
  .command("mcp")
  .description("run the knowledge cards MCP server over stdio")
  .action(async () => {
    const { startMcpStdio } = await import("../mcp/stdio.ts");
    await startMcpStdio();
  });

await program.parseAsync(process.argv);
