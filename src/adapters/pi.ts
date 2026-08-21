/**
 * Pi extension: fetch (titles) after the user query, reflect after the
 * final answer — same harness loop as the README diagram.
 *
 * `agent_end` + `deliverAs: "followUp"` continues the current `session.prompt()`
 * so Harbor `pi --print --mode json` still runs the reflect turn.
 */
import { fetchCards } from "../harness/fetch.ts";
import { REFLECT_FOLLOWUP_TITLE, reflectFollowup } from "../harness/reflect.ts";

const MUTATION_TOOLS = new Set(["write", "edit"]);

type PiCtx = {
  cwd: string;
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

type AssistantLike = {
  role?: string;
  stopReason?: string;
};

type AgentEndEvent = {
  messages?: AssistantLike[];
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

function lastAssistant(event: AgentEndEvent): AssistantLike | undefined {
  const messages = event.messages;
  if (!messages) return undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role === "assistant") return msg;
  }
  return undefined;
}

export function isKnowcardsReflectPrompt(prompt: string): boolean {
  return prompt.includes(REFLECT_FOLLOWUP_TITLE);
}

export default function knowcardsPi(pi: PiExtensionApi): void {
  let didReflect = false;
  let sawMutation = false;

  pi.on("session_start", () => {
    didReflect = false;
    sawMutation = false;
  });

  pi.on("before_agent_start", async (raw, ctx) => {
    try {
      const event = raw as BeforeAgentStartEvent;
      const prompt = event.prompt ?? "";
      if (isKnowcardsReflectPrompt(prompt)) return;
      didReflect = false;
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

  pi.on("agent_end", async (raw, ctx) => {
    try {
      if (didReflect || !sawMutation) return;
      const stop = lastAssistant(raw as AgentEndEvent)?.stopReason;
      if (stop === "error" || stop === "aborted") return;
      const followup = await reflectFollowup(undefined, { cwd: ctx.cwd });
      if (!followup) return;
      didReflect = true;
      sawMutation = false;
      pi.sendUserMessage(followup, { deliverAs: "followUp" });
    } catch {
      // fail open
    }
  });
}
