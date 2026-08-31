/**
 * Pi extension: fetch (titles) after the user query, reflect when the
 * session ends — same harness loop as the README diagram.
 *
 * `session_shutdown` + `sendUserMessage` runs the reflect turn before Pi
 * disposes the session, so Harbor `pi --print --mode json` still reflects.
 * Skip `reload` (not a session end).
 */
import { fetchCards } from "../harness/fetch.ts";
import { REFLECT_FOLLOWUP_TITLE, reflectFollowup } from "../harness/reflect.ts";

const MUTATION_TOOLS = new Set(["write", "edit"]);

type SessionEntry = {
  type?: string;
  message?: { role?: string; stopReason?: string };
};

type PiCtx = {
  cwd: string;
  sessionManager?: { getEntries?: () => SessionEntry[] };
};

type BeforeAgentStartEvent = {
  prompt?: string;
  systemPrompt?: string;
};

type ToolCallEvent = {
  toolName?: string;
  name?: string;
  tool?: string;
};

type SessionShutdownEvent = {
  reason?: "quit" | "reload" | "new" | "resume" | "fork";
};

type PiExtensionApi = {
  on(event: string, handler: (event: unknown, ctx: PiCtx) => unknown): void;
  sendUserMessage(
    text: string,
    options?: { deliverAs?: "steer" | "followUp" },
  ): void;
};

function toolName(event: ToolCallEvent): string {
  for (const v of [event.toolName, event.name, event.tool]) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function lastAssistantStop(ctx: PiCtx): string | undefined {
  const entries = ctx.sessionManager?.getEntries?.() ?? [];
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry?.type === "message" && entry.message?.role === "assistant") {
      return entry.message.stopReason;
    }
  }
  return undefined;
}

export function isKnowcardsReflectPrompt(prompt: string): boolean {
  return prompt.includes(REFLECT_FOLLOWUP_TITLE);
}

export default function knowcardsPi(pi: PiExtensionApi): void {
  let didReflect = false;
  let sawMutation = false;
  let settleReflect: (() => void) | undefined;

  pi.on("session_start", () => {
    didReflect = false;
    sawMutation = false;
  });

  pi.on("agent_settled", () => {
    settleReflect?.();
    settleReflect = undefined;
  });

  pi.on("before_agent_start", async (raw, ctx) => {
    try {
      const event = raw as BeforeAgentStartEvent;
      const prompt = event.prompt ?? "";
      if (isKnowcardsReflectPrompt(prompt)) return;
      const fetched = await fetchCards(prompt, { cwd: ctx.cwd });
      if (!fetched.text) return;
      const base = event.systemPrompt ?? "";
      return {
        systemPrompt: base ? `${base}\n\n${fetched.text}` : fetched.text,
      };
    } catch {
      return undefined;
    }
  });

  pi.on("tool_call", (raw) => {
    if (MUTATION_TOOLS.has(toolName(raw as ToolCallEvent))) sawMutation = true;
  });

  pi.on("session_shutdown", async (raw, ctx) => {
    try {
      if ((raw as SessionShutdownEvent).reason === "reload") return;
      if (didReflect || !sawMutation) return;
      const stop = lastAssistantStop(ctx);
      if (stop === "error" || stop === "aborted") return;
      const followup = await reflectFollowup(undefined, { cwd: ctx.cwd });
      if (!followup) return;
      didReflect = true;
      sawMutation = false;
      const settled = new Promise<void>((resolve) => {
        settleReflect = resolve;
      });
      pi.sendUserMessage(followup, { deliverAs: "followUp" });
      await settled;
    } catch {
      // fail open
    }
  });
}
