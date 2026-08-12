export {
  type ProposeCardInput,
  type ProposeCardResult,
  proposeCard,
} from "./core/ingestion.ts";
export {
  formatCardsForInject,
  KNOWLEDGE_CARDS_HEADER,
  TRUST_REMINDER,
} from "./core/inject.ts";
export { parseCardMarkdown, serializeCardMarkdown } from "./core/markdown.ts";
export {
  formatReflectFollowup,
  loadReflectPrompt,
} from "./core/reflection.ts";
export { getCard, queryCards, queryLibrary } from "./core/retrieval.ts";
export { slugify } from "./core/slug.ts";
export {
  type CardStorage,
  FsCardStorage,
  openLibrary,
  requireNotebook,
} from "./core/storage.ts";
export {
  allCards,
  DEFAULT_CARDS_ROOT,
  DEFAULT_NOTEBOOK_ID,
  emptyLibrary,
  emptyNotebook,
  getNotebook,
  type KnowledgeCard,
  type KnowledgeLibrary,
  type Notebook,
  withNotebook,
} from "./core/types/index.ts";
export {
  INJECT_CARD_CAP,
  onSessionPrompt,
  onSessionStop,
  type SessionPromptOptions,
  type SessionStopOptions,
} from "./lifecycle/session.ts";
