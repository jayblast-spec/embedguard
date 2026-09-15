# embedguard

**Catches silent embedding-model swaps under a vector index before they corrupt similarity search — dimension checks plus canary-probe drift detection, provider-agnostic.**

## The gap this fills

When you change the embedding model behind a vector index — upgrade a version, switch providers, change chunking — vectors already in the index were produced by the old model, and new query vectors come from the new one. The two spaces are incompatible: similarity scores and rankings become meaningless, and *nothing errors*. This is a widely-felt, well-documented failure mode across the RAG/vector-database ecosystem, and today it's usually caught by hand-rolled, per-project scripts (or not caught at all until search quality visibly degrades). The general-purpose ML drift-monitoring platforms (Evidently, Alibi Detect) that do exist are heavyweight Python observability stacks meant for full model-monitoring infrastructure — there wasn't a small, embeddable, provider-agnostic library that just answers the specific question: **is the embedding model that produced this vector still the one this index was built with?**

## What it does

embedguard never calls an embedding provider itself — you bring the vectors from whatever model/provider you already use, and it does the math and bookkeeping:

### `createFingerprint({ canaries, modelId? })`
Builds a small fingerprint from a handful of "canary" probe strings you've embedded with your current model: their dimension, and the embeddings themselves. Store this alongside your index's metadata.

### `checkDimension(fingerprint, embedding)`
The cheap, unambiguous check — does a vector even have the right number of dimensions. Catches an obviously different model immediately.

### `checkDrift(fingerprint, freshCanaries, { threshold? })`
The subtle, dangerous case dimension checking can't catch: a swap between models that happen to produce the *same* dimensionality (common within a provider's model family). Re-embed your fingerprint's exact canary probes with whatever model is currently configured, and this compares cosine similarity per probe — a real model swap shows up as a sharp similarity drop even when dimensions still match.

## Install

```bash
npm install embedguard
```

## Usage

```ts
import { createFingerprint, checkDimension, checkDrift } from "embedguard";

// Once, when you build your index -- embed a handful of representative strings yourself:
const fingerprint = createFingerprint({
  modelId: "text-embedding-3-small",
  canaries: [
    { probe: "return policy", embedding: await embed("return policy") },
    { probe: "shipping times", embedding: await embed("shipping times") },
  ],
});
// Store `fingerprint` next to your index (a metadata row, a JSON file, whatever you already use).

// Later -- before trusting a batch of new vectors, or on a schedule:
const freshCanaries = await Promise.all(
  fingerprint.canaries.map(async (c) => ({ probe: c.probe, embedding: await embed(c.probe) }))
);
const drift = checkDrift(fingerprint, freshCanaries);
if (!drift.ok) {
  throw new Error(`embedding model drift detected: ${JSON.stringify(drift.probes)}`);
}
```

Run the annotated demo (simulates exactly this bug — a same-dimension model swap that dimension-checking alone would miss):

```bash
npx tsx examples/demo.ts
```

## Non-goals (v1)

- **Does not call any embedding provider.** You already have a way to generate embeddings; this only validates them. Zero runtime dependencies as a result.
- **Not a full ML observability platform.** No dashboards, no storage backend, no scheduling — it's a small library you call from your own pipeline or CI job.
- **Doesn't reindex or migrate anything for you.** It tells you a mismatch exists; what you do about it (reindex, alert, block deploys) is your call.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## License

MIT
