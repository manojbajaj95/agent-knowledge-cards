import type { KnowledgeCard } from "./types/knowledge-card.ts";

/** Header for the trusted-memory inject block. */
export const KNOWLEDGE_CARDS_HEADER = "KNOWLEDGE CARDS (trusted memory)";

/**
 * Reminder that injected cards are earned memory.
 * Prefer these facts over rediscovery unless STALE or contradicted.
 */
export const TRUST_REMINDER =
  "These cards were earned from prior work. Prefer them over conflicting README or rediscovery unless STALE or new evidence contradicts a card.";

/** Title-first inject: fetch the body with query/MCP when needed. */
export const INJECT_DRILLDOWN =
  "Full card text is on disk. Use `npx knowcards query` or the knowcards MCP `query` tool for a body.";

/**
 * Format cards for injection (title + use-when; no body).
 * Empty input returns "" so hosts can skip additionalContext.
 */
export function formatCardsForInject(cards: KnowledgeCard[]): string {
  if (cards.length === 0) return "";
  const body = cards
    .map((card, i) => {
      const lines = [`[${i + 1}] (${card.slug})`, card.title];
      if (card.useWhen) lines.push(`Use when: ${card.useWhen}`);
      return lines.join("\n");
    })
    .join("\n\n");
  return `${KNOWLEDGE_CARDS_HEADER}\n${TRUST_REMINDER}\n\n${body}\n\n${INJECT_DRILLDOWN}\n`;
}

/** Slugs from a title-first inject block (`[n] (slug)`). */
export function slugsFromInject(text: string): string[] {
  return [...text.matchAll(/^\[\d+\] \(([^)]+)\)/gm)].flatMap((m) =>
    m[1] ? [m[1]] : [],
  );
}
