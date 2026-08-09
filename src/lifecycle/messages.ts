import type { KnowledgeCard } from "../core/types/knowledge-card.ts";
import { formatCardsForInject } from "../core/inject.ts";

/**
 * Inject formatted cards into a message list (custom / CL-bench-style harness).
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
  const [first, ...rest] = messages;
  return [first!, { role: "user", content: block }, ...rest];
}
