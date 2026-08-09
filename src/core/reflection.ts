import type { Episode, KnowledgeLibrary } from "./types/index.ts";

/**
 * TODO: LLM reflection — distill an episode into proposed cards
 * TODO: full notebook rebuild (CL bench KnowledgeCardNotebook)
 * TODO: task-tuned reflection prompts
 * TODO: drift / STALE card handling
 * TODO: confirm / upvote / reject feedback on cards
 */
export function reflect(
  _library: KnowledgeLibrary,
  _episode: Episode,
): KnowledgeLibrary {
  throw new Error(
    "reflect is not implemented yet — see TODOs in src/core/reflection.ts",
  );
}
