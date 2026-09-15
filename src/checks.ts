import { cosineSimilarity } from "./similarity.js";
import type { CanaryEmbedding, EmbeddingFingerprint } from "./types.js";

export interface DimensionCheckResult {
  ok: boolean;
  expected: number;
  actual: number;
}

/** The cheap, unambiguous check: does this vector even have the right number of dimensions for the model this index was built with. */
export function checkDimension(fingerprint: EmbeddingFingerprint, embedding: number[]): DimensionCheckResult {
  return { ok: embedding.length === fingerprint.dimension, expected: fingerprint.dimension, actual: embedding.length };
}

export type ProbeDriftStatus = "ok" | "drifted" | "missing";

export interface ProbeDriftResult {
  probe: string;
  status: ProbeDriftStatus;
  similarity: number | null;
}

export interface DriftCheckResult {
  ok: boolean;
  threshold: number;
  probes: ProbeDriftResult[];
  meanSimilarity: number | null;
}

export interface CheckDriftOptions {
  /**
   * Minimum cosine similarity between a stored canary embedding and a fresh
   * embedding of the exact same probe text for it to count as "the same
   * model." Re-embedding identical text with an unchanged, deterministic
   * model should score at or near 1.0; 0.98 leaves headroom for providers
   * with minor floating-point or batching nondeterminism without missing a
   * real model swap, which typically drops similarity far more sharply.
   */
  threshold?: number;
}

/**
 * The subtle, dangerous case dimension checking can't catch: a model swap
 * that happens to produce vectors of the same dimensionality (common when
 * switching between models from the same family or provider). Re-embed your
 * fingerprint's canary probes with whatever model is currently configured
 * and compare -- a real swap shows up as a sharp similarity drop even when
 * dimensions still match.
 */
export function checkDrift(fingerprint: EmbeddingFingerprint, freshCanaries: CanaryEmbedding[], options: CheckDriftOptions = {}): DriftCheckResult {
  const threshold = options.threshold ?? 0.98;
  const freshByProbe = new Map(freshCanaries.map((c) => [c.probe, c.embedding]));

  const probes: ProbeDriftResult[] = fingerprint.canaries.map((stored) => {
    const fresh = freshByProbe.get(stored.probe);
    if (!fresh) return { probe: stored.probe, status: "missing", similarity: null };
    if (fresh.length !== stored.embedding.length) return { probe: stored.probe, status: "drifted", similarity: null };

    const similarity = cosineSimilarity(stored.embedding, fresh);
    return { probe: stored.probe, status: similarity >= threshold ? "ok" : "drifted", similarity };
  });

  const similarities = probes.map((p) => p.similarity).filter((s): s is number => s !== null);
  const meanSimilarity = similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : null;

  return { ok: probes.every((p) => p.status === "ok"), threshold, probes, meanSimilarity };
}
