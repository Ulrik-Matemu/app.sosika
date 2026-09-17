import { describe, it, expect } from "vitest";
import { cosineSimilarity, hashText } from "../src/lib/gemini";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });
});

describe("hashText", () => {
  it("is deterministic", () => {
    expect(hashText("Chapati. A flatbread.")).toBe(hashText("Chapati. A flatbread."));
  });

  it("differs for different text", () => {
    expect(hashText("Chapati")).not.toBe(hashText("Samosa"));
  });
});
