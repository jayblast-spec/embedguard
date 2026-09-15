import { describe, expect, it } from "vitest";
import { createFingerprint } from "../src/fingerprint.js";
import { InvalidCanariesError } from "../src/types.js";

describe("createFingerprint", () => {
  it("builds a fingerprint from canaries and derives dimension from them", () => {
    const fp = createFingerprint({
      modelId: "test-model-v1",
      canaries: [
        { probe: "hello", embedding: [1, 0, 0] },
        { probe: "world", embedding: [0, 1, 0] },
      ],
      now: 12345,
    });

    expect(fp.dimension).toBe(3);
    expect(fp.modelId).toBe("test-model-v1");
    expect(fp.canaries).toHaveLength(2);
    expect(fp.createdAt).toBe(12345);
  });

  it("throws when given no canaries", () => {
    expect(() => createFingerprint({ canaries: [] })).toThrow(InvalidCanariesError);
  });

  it("throws when canary embeddings have inconsistent dimensions", () => {
    expect(() =>
      createFingerprint({
        canaries: [
          { probe: "a", embedding: [1, 2, 3] },
          { probe: "b", embedding: [1, 2] },
        ],
      })
    ).toThrow(InvalidCanariesError);
  });

  it("throws on duplicate probe texts", () => {
    expect(() =>
      createFingerprint({
        canaries: [
          { probe: "same", embedding: [1, 0] },
          { probe: "same", embedding: [0, 1] },
        ],
      })
    ).toThrow(InvalidCanariesError);
  });

  it("defensively copies embeddings so later mutation of the input doesn't corrupt the fingerprint", () => {
    const embedding = [1, 2, 3];
    const fp = createFingerprint({ canaries: [{ probe: "x", embedding }] });
    embedding[0] = 999;
    expect(fp.canaries[0]!.embedding).toEqual([1, 2, 3]);
  });
});
