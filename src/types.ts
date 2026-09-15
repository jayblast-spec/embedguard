export interface CanaryEmbedding {
  /** The exact probe text/input that produced this embedding. Matched by exact string equality across checks. */
  probe: string;
  embedding: number[];
}

export interface EmbeddingFingerprint {
  dimension: number;
  /** Free-text label for whatever you consider "the model" -- name, version, provider, whatever you want to distinguish. Not interpreted, only ever compared for your own logging. */
  modelId?: string;
  canaries: CanaryEmbedding[];
  createdAt: number;
}

export class EmbedGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidCanariesError extends EmbedGuardError {}
