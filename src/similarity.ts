/** Cosine similarity in [-1, 1]. Returns 0 for a zero-magnitude vector rather than NaN or throwing -- there is no meaningful direction to compare. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new RangeError(`vectors must have the same dimension to compare (got ${a.length} and ${b.length})`);
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
