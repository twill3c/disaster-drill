import { describe, expect, it } from "vitest";

import { createRng, seedFromString } from "@/core/random";

// 出所: SPEC F-18 / G-13
describe("T-060 PRNG(G-13)", () => {
  it("同一シードは同一列、異なるシードは異なる列", () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const la = Array.from({ length: 100 }, () => a.next());
    const lb = Array.from({ length: 100 }, () => b.next());
    const lc = Array.from({ length: 100 }, () => c.next());
    expect(la).toEqual(lb);
    expect(la).not.toEqual(lc);
    for (const v of la) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("int(n) ∈ [0,n)、pick は配列の要素", () => {
    const r = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = r.int(5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
      seen.add(v);
    }
    // 500 回で 5 値すべてが出ないなら分布が壊れている
    expect(seen.size).toBe(5);
    const arr = ["x", "y", "z"];
    expect(arr).toContain(r.pick(arr));
  });
  it("seedFromString は決定的で、別の文字列で別の値", () => {
    expect(seedFromString("abc")).toBe(seedFromString("abc"));
    expect(seedFromString("abc")).not.toBe(seedFromString("abd"));
    expect(Number.isInteger(seedFromString("何でも"))).toBe(true);
  });
});
