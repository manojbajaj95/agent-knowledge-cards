/** A single durable knowledge card (one markdown file on disk). */
export type KnowledgeCard = {
  id: string;
  /** Human title; required when proposing. */
  title: string;
  /** Filename without `.md`; derived from title via slugify. */
  slug: string;
  createdAt: string;
  updatedAt: string;
  /** Optional situation hint (when to apply this card). */
  useWhen?: string;
  /** Card details (markdown body below frontmatter). */
  body: string;
};
