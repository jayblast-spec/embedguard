import { describe, expect, it } from "vitest";
import { createFingerprint } from "../src/fingerprint.js";
import { checkDimension, checkDrift } from "../src/checks.js";

function baseFingerprint() {
  return createFingerprint({
    modelId: "model-a",
    canaries: [
      { probe: "the quick brown fox", embedding: [1, 0, 0, 0] },
      { probe: "hello world", embedding: [0, 1, 0, 0] },
      { probe: "local-first software", embedding: [0, 0, 1, 0] },
    ],
  });
}

describe("checkDimension", () => {
  it("passes when the embedding's length matches the fingerprint", () => {
    const fp = baseFingerprint();
    const result = checkDimension(fp, [1, 2, 3, 4]);
    expect(result).toEqual({ ok: true, expected: 4, actual: 4 });
  });

  it("fails when dimensions differ -- the unambiguous case, e.g. an obviously different model", () => {
    const fp = baseFingerprint();
    const result = checkDimension(fp, [1, 2, 3]);
    expect(result).toEqual({ ok: false, expected: 4, actual: 3 });
  });
});

describe("checkDrift", () => {
  it("passes when re-embedding the same probes with an unchanged model returns identical vectors", () => {
    const fp = baseFingerprint();
    const result = checkDrift(fp, fp.canaries);
    expect(result.ok).toBe(true);
    expect(result.meanSimilarity).toBeCloseTo(1, 10);
    expect(result.probes.every((p) => p.status === "ok")).toBe(true);
  });

  it("flags drift when a probe's fresh embedding points in a different direction, even with the same dimension", () => {
    const fp = baseFingerprint();
    const swapped = [
      { probe: "the quick brown fox", embedding: [0, 0, 0, 1] }, // orthogonal to the stored [1,0,0,0]
      { probe: "hello world", embedding: [0, 1, 0, 0] },
      { probe: "local-first software", embedding: [0, 0, 1, 0] },
    ];
    const result = checkDrift(fp, swapped);
    expect(result.ok).toBe(false);
    const drifted = result.probes.find((p) => p.probe === "the quick brown fox");
    expect(drifted?.status).toBe("drifted");
    expect(drifted?.similarity).toBeCloseTo(0, 10);
  });

  it("reports a probe as missing rather than silently skipping it when the fresh set doesn't include it", () => {
    const fp = baseFingerprint();
    const partial = fp.canaries.slice(1); // drop "the quick brown fox"
    const result = checkDrift(fp, partial);
    expect(result.ok).toBe(false);
    const missing = result.probes.find((p) => p.probe === "the quick brown fox");
    expect(missing).toEqual({ probe: "the quick brown fox", status: "missing", similarity: null });
  });

  it("respects a custom threshold", () => {
    const fp = createFingerprint({ canaries: [{ probe: "x", embedding: [1, 0] }] });
    // A small rotation: similarity is high but not 1.0
    const slightlyRotated = [{ probe: "x", embedding: [0.99, 0.14] }];

    const strict = checkDrift(fp, slightlyRotated, { threshold: 0.999 });
    expect(strict.ok).toBe(false);

    const lenient = checkDrift(fp, slightlyRotated, { threshold: 0.9 });
    expect(lenient.ok).toBe(true);
  });
});
