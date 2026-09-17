import { describe, it, expect } from "vitest";
import { normalizePhone } from "../src/lib/phone";

describe("normalizePhone", () => {
  it("converts a leading-0 local number to +255 format", () => {
    expect(normalizePhone("0778903468")).toBe("+255778903468");
  });

  it("converts a bare 6/7/8-leading number to +255 format", () => {
    expect(normalizePhone("778903468")).toBe("+255778903468");
  });

  it("leaves an already-international number intact modulo formatting", () => {
    expect(normalizePhone("+255778903468")).toBe("+255778903468");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizePhone("")).toBe("");
  });
});
