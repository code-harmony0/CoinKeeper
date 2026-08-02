/** Classic Levenshtein edit distance. */
const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
};

/** 0 (unrelated) to 1 (identical), case-insensitive. */
export const normalizedSimilarity = (a: string, b: string): number => {
  const normA = a.trim().toLowerCase();
  const normB = b.trim().toLowerCase();
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;
  const distance = levenshtein(normA, normB);
  return 1 - distance / maxLen;
};

export interface MergeCandidate {
  a: string;
  b: string;
  score: number;
}

/** All pairs of categories whose name similarity is at or above the threshold. */
export const findMergeCandidates = (
  categories: Array<{ id: string; name: string }>,
  threshold: number = 0.6,
): MergeCandidate[] => {
  const pairs: MergeCandidate[] = [];
  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const score = normalizedSimilarity(categories[i].name, categories[j].name);
      if (score >= threshold) {
        pairs.push({ a: categories[i].id, b: categories[j].id, score });
      }
    }
  }
  return pairs;
};
