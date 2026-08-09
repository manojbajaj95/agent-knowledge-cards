/**
 * Reciprocal Rank Fusion over ranked id lists.
 * score(d) = Σ 1 / (k + rank_i(d)) with 1-based ranks.
 */
export function reciprocalRankFusion(
  rankedLists: readonly (readonly string[])[],
  k: number = 60,
): string[] {
  const scores = new Map<string, number>();
  for (const list of rankedLists) {
    list.forEach((id, index) => {
      const rank = index + 1;
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank));
    });
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id);
}
