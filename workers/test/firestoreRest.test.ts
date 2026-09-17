import { describe, it, expect } from "vitest";
import { encodeValue, decodeValue } from "../src/lib/firestoreRest";

describe("Firestore value encode/decode round trip", () => {
  it("round-trips primitives", () => {
    for (const v of ["hello", 42, 3.14, true, false, null]) {
      expect(decodeValue(encodeValue(v))).toEqual(v);
    }
  });

  it("round-trips arrays and nested objects", () => {
    const value = {
      name: "Chapati",
      price: 2500,
      tags: ["breakfast", "swahili"],
      nested: { available: true, count: 3 },
    };
    expect(decodeValue(encodeValue(value))).toEqual(value);
  });

  it("encodes integers and doubles distinctly but decodes both to number", () => {
    expect(encodeValue(5)).toEqual({ integerValue: "5" });
    expect(encodeValue(5.5)).toEqual({ doubleValue: 5.5 });
    expect(decodeValue(encodeValue(5))).toBe(5);
    expect(decodeValue(encodeValue(5.5))).toBe(5.5);
  });

  it("decodes vectorValue fields (native Firestore vector wire format) to a number array", () => {
    const raw = { vectorValue: { values: [0.1, 0.2, 0.3] } };
    expect(decodeValue(raw)).toEqual([0.1, 0.2, 0.3]);
  });
});
