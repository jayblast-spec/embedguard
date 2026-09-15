import { InvalidCanariesError, type CanaryEmbedding, type EmbeddingFingerprint } from "./types.js";

export interface CreateFingerprintOptions {
  modelId?: string;
  canaries: CanaryEmbedding[];
  now?: number;
}

/**
 * Builds a fingerprint of "whatever embedding model is currently in use" from
 * a small set of canary probes you embed yourself -- embedguard never calls
 * an embedding provider; you bring the vectors, it only does the math and
 * bookkeeping. Store the result alongside your vector index (as its own
 * small metadata record) and re-check future embeddings against it.
 */
export function createFingerprint(options: CreateFingerprintOptions): EmbeddingFingerprint {
  if (options.canaries.length === 0) {
    throw new InvalidCanariesError("at least one canary probe is required to build a fingerprint");
  }

  const dimension = options.canaries[0]!.embedding.length;
  for (const canary of options.canaries) {
    if (canary.embedding.length !== dimension) {
      throw new InvalidCanariesError(
        `all canary embeddings must share one dimension; "${canary.probe}" has ${canary.embedding.length}, expected ${dimension}`
      );
    }
  }

  const probes = new Set(options.canaries.map((c) => c.probe));
  if (probes.size !== options.canaries.length) {
    throw new InvalidCanariesError("canary probe texts must be unique within a fingerprint");
  }

  return {
    dimension,
    modelId: options.modelId,
    canaries: options.canaries.map((c) => ({ probe: c.probe, embedding: [...c.embedding] })),
    createdAt: options.now ?? Date.now(),
  };
}
