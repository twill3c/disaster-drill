import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { findViolations } from "./purity-rule";

// 出所: SPEC N-01 / N-02。検査器は tests/purity-rule.ts に切り出し、
// パターン自身を陽性・陰性対照でテストする(HC-041)。

const CORE = join(process.cwd(), "src", "core");

describe("T-090 純粋性(G-07)", () => {
  it("走査対象が空でない", () => {
    const files = readdirSync(CORE).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
  });
  it("src/core に禁止トークンが無い", () => {
    const files = readdirSync(CORE).filter((f) => f.endsWith(".ts"));
    const hits = files.flatMap((f) =>
      findViolations(readFileSync(join(CORE, f), "utf8")).map((v) => `${f}:${v.line} ${v.token}`),
    );
    expect(hits).toEqual([]);
  });
  it("陽性対照: 検査器は 6 種の壊し方を捕まえる", () => {
    const bad = [
      "const x = Math.random();",
      "const t = Date.now();",
      "const d = new Date();",
      "window.alert(1);",
      "document.title = 'x';",
      "localStorage.setItem('a', 'b');",
    ];
    for (const src of bad) {
      expect(findViolations(src).length, src).toBeGreaterThan(0);
    }
  });
  it("陰性対照: 言及と識別子の一部は撃たない", () => {
    const ok = [
      "// Math.random() は使わない(N-01)",
      "/* new Date() も禁止 */",
      "const windowSize = 3;",
      "const documentTitle = 'x';",
      "const seed = 20260907;",
    ];
    for (const src of ok) {
      expect(findViolations(src), src).toEqual([]);
    }
  });
});

describe("T-091 出荷構成(G-08)", () => {
  it("dependencies の鍵集合は {next, react, react-dom}", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    expect(new Set(Object.keys(pkg.dependencies))).toEqual(new Set(["next", "react", "react-dom"]));
  });
  it('next.config.ts に非コメント行として output: "export" がある', () => {
    const src = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    const live = src
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    expect(live).toMatch(/output:\s*"export"/);
  });
});
