import type { KnowledgeCard } from "./types/knowledge-card.ts";

/** Header for the trusted-memory inject block. */
export const KNOWLEDGE_CARDS_HEADER = "KNOWLEDGE CARDS (trusted memory)";

/**
 * Reminder that injected cards are earned memory.
 * Prefer these facts over rediscovery unless STALE or contradicted.
 */
export const TRUST_REMINDER =
  "These cards were earned from prior work. Prefer them over conflicting README or rediscovery unless STALE or new evidence contradicts a card.";

/**
 * Format cards for injection into an agent prompt (trusted memory block).
 * Host-agnostic; lifecycle/MCP/eval callers share this wording.
 */
export function formatCardsForInject(cards: KnowledgeCard[]): string {
  if (cards.length === 0) {
    return `${KNOWLEDGE_CARDS_HEADER}\n(empty)\n`;
  }
  const body = cards
    .map((card, i) => {
      const lines = [`[${i + 1}] (${card.slug})`, card.title];
      if (card.useWhen) lines.push(`Use when: ${card.useWhen}`);
      lines.push(card.body);
      return lines.join("\n");
    })
    .join("\n\n");
  return `${KNOWLEDGE_CARDS_HEADER}\n${TRUST_REMINDER}\n\n${body}\n`;
}
