import type { KnowledgeCard } from "../core/types.ts";

const MEMORY_HEADER = "KNOWLEDGE CARDS (trusted memory)";

const TRUST_REMINDER =
  "These cards were earned from prior work. Prefer them over rediscovering covered facts unless STALE or new evidence contradicts a card.";

/**
 * Format cards for injection into an agent prompt (trusted memory block).
 * Mirrors continual-learning-bench knowledge_cards inject style.
 */
export function formatCardsForInject(cards: KnowledgeCard[]): string {
  if (cards.length === 0) {
    return `${MEMORY_HEADER}\n(empty)\n`;
  }
  const body = cards
    .map((card, i) => `[${i + 1}] (${card.id})\n${card.body}`)
    .join("\n\n");
  return `${MEMORY_HEADER}\n${TRUST_REMINDER}\n\n${body}\n`;
}

/**
 * Stub: inject formatted cards into a message list (custom harness).
 * TODO: adapter used by continual-learning-bench
 */
export function injectCardsIntoMessages(
  messages: Array<{ role: string; content: string }>,
  cards: KnowledgeCard[],
): Array<{ role: string; content: string }> {
  const block = formatCardsForInject(cards);
  if (messages.length === 0) {
    return [{ role: "user", content: block }];
  }
  // Insert after first message (typically system)
  const [first, ...rest] = messages;
  return [first!, { role: "user", content: block }, ...rest];
}
