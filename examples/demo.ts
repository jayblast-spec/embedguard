/**
 * Simulates the classic silent-corruption bug: a vector index built with
 * "model A" gets queried after someone swaps in "model B" -- same
 * dimension, completely different vector space. Run with:
 *   npx tsx examples/demo.ts
 */
import { createFingerprint, checkDimension, checkDrift } from "../src/index.js";

// Pretend embeddings -- in real use these come from your actual embedding provider.
const modelACanaries = [
  { probe: "return policy", embedding: [0.8, 0.1, 0.0, 0.6] },
  { probe: "shipping times", embedding: [0.1, 0.9, 0.2, 0.0] },
  { probe: "account settings", embedding: [0.0, 0.2, 0.9, 0.1] },
];

const fingerprint = createFingerprint({ modelId: "embedding-model-a-v1", canaries: modelACanaries });
console.log(`Fingerprint built for "${fingerprint.modelId}", dimension ${fingerprint.dimension}`);

console.log("\n--- Scenario 1: nothing changed, re-embedding the same canaries ---");
const stableResult = checkDrift(fingerprint, modelACanaries);
console.log(`ok=${stableResult.ok}  meanSimilarity=${stableResult.meanSimilarity?.toFixed(4)}`);

console.log("\n--- Scenario 2: someone silently swapped in model B (same dimension!) ---");
const modelBCanaries = [
  { probe: "return policy", embedding: [0.1, 0.7, 0.6, 0.1] },
  { probe: "shipping times", embedding: [0.6, 0.0, 0.1, 0.8] },
  { probe: "account settings", embedding: [0.9, 0.3, 0.0, 0.2] },
];
const dimResult = checkDimension(fingerprint, modelBCanaries[0]!.embedding);
console.log(`Dimension check alone: ok=${dimResult.ok} (same dimension, so this misses the swap!)`);

const driftResult = checkDrift(fingerprint, modelBCanaries);
console.log(`Drift check: ok=${driftResult.ok}  meanSimilarity=${driftResult.meanSimilarity?.toFixed(4)}`);
for (const p of driftResult.probes) {
  console.log(`  ${p.status.padEnd(8)} "${p.probe}"  similarity=${p.similarity?.toFixed(4)}`);
}
