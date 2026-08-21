import { queryLibrary } from "../memory/retrieval.ts";
import { openLibrary } from "../memory/storage.ts";
import {
  DEFAULT_CARDS_ROOT,
  type KnowledgeCard,
} from "../memory/types/index.ts";

/** Header for the trusted-memory fetch block. */
export const KNOWLEDGE_CARDS_HEADER = "KNOWLEDGE CARDS (trusted memory)";

/**
 * Reminder that fetched cards are earned memory.
 * Prefer these facts over rediscovery unless STALE or contradicted.
 */
export const TRUST_REMINDER =
  "These cards were earned from prior work. Prefer them over conflicting README or rediscovery unless STALE or new evidence contradicts a card.";

/** Title-first fetch: get the body with query/MCP when needed. */
export const FETCH_DRILLDOWN =
  "Use `npx knowcards query` or the knowcards MCP `query` tool for a body.";

/** Max cards per fetch. */
export const FETCH_CARD_CAP = 8;

/** Stay under Cursor/Claude ~10k additionalContext inline cap. */
export const FETCH_CHAR_CAP = 8000;

/**
 * Format cards for fetch (title + use-when; no body).
 * Empty input returns "" so hosts can skip additionalContext.
 */
export function formatCardsForFetch(cards: KnowledgeCard[]): string {
  if (cards.length === 0) return "";
  const body = cards
    .map((card, i) => {
      const lines = [`[${i + 1}] (${card.slug})`, card.title];
      if (card.useWhen) lines.push(`Use when: ${card.useWhen}`);
      return lines.join("\n");
    })
    .join("\n\n");
  return `${KNOWLEDGE_CARDS_HEADER}\n${TRUST_REMINDER}\n\n${body}\n\n${FETCH_DRILLDOWN}\n`;
}

/** Slugs from a title-first fetch block (`[n] (slug)`). */
export function slugsFromFetch(text: string): string[] {
  return [...text.matchAll(/^\[\d+\] \(([^)]+)\)/gm)].flatMap((m) =>
    m[1] ? [m[1]] : [],
  );
}

function budgetFetchCards(cards: KnowledgeCard[]): KnowledgeCard[] {
  let out = cards.slice(0, FETCH_CARD_CAP);
  while (out.length > 1 && formatCardsForFetch(out).length > FETCH_CHAR_CAP) {
    out = out.slice(0, -1);
  }
  return out;
}

export type FetchCardsOptions = {
  /** Cards root (default `.agents/knowledge_cards`). */
  root?: string;
  /** Project cwd for path resolution (unused today; reserved). */
  cwd?: string;
  /** Additive hosts: omit slugs already fetched this session. */
  skipSlugs?: Iterable<string>;
};

/** Retrieve + format for a prompt. Empty `text` means skip host fetch. */
export type FetchCardsResult = {
  text: string;
  slugs: string[];
};

/**
 * Fetch: retrieve cards for the user message and format trusted memory.
 * Empty query, no hits, or all hits skipped yields `{ text: "", slugs: [] }`
 * (hosts skip additionalContext).
 */
export async function fetchCards(
  userText: string,
  options: FetchCardsOptions = {},
): Promise<FetchCardsResult> {
  const root = options.root ?? DEFAULT_CARDS_ROOT;
  const q = userText.trim();
  if (!q) return { text: "", slugs: [] };
  const skip = new Set(options.skipSlugs ?? []);
  const { library } = await openLibrary(root);
  const cards = budgetFetchCards(
    queryLibrary(library, q).filter((c) => !skip.has(c.slug)),
  );
  return {
    text: formatCardsForFetch(cards),
    slugs: cards.map((c) => c.slug),
  };
}
