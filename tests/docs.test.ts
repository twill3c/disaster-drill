import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SCENARIOS } from "@/data";

/**
 * 文書中の数値の検算(HC-152)。
 *
 * **実装のテストは、README や SPEC に書いた数を守らない。** 数を書いた側から
 * 検算しないと、実装が正しいまま文書だけが嘘になる。しかも数値は具体的なので、
 * 後から読むと実測値として振る舞う —— loop_001 で実際に踏んだ(README のシナリオ表に
 * EQ01 の場面数を 9 と書いたが、実際は 10 だった)。
 *
 * ここでは README の表を**実装から導いた値**と突き合わせる。
 * 出所: SPEC F-16 / F-03(シナリオの構造そのもの)
 */

const README = readFileSync(join(process.cwd(), "README.md"), "utf8");

/** README のシナリオ表から `| ID | … | 難易度 | 場面数 |` の行を拾う */
function tableRows(): { id: string; stars: number; events: number }[] {
  const rows: { id: string; stars: number; events: number }[] = [];
  for (const line of README.split("\n")) {
    const m = /^\|\s*([A-Z]{2}\d{2})\s*\|([^|]*)\|\s*([★☆]+)\s*\|\s*(\d+)\s*\|/.exec(line);
    if (!m) continue;
    rows.push({
      id: m[1],
      stars: (m[3].match(/★/g) ?? []).length,
      events: Number(m[4]),
    });
  }
  return rows;
}

describe("T-080 README の数値が実装と一致する(HC-152)", () => {
  it("表が空でない(検算が空振りしていないこと)", () => {
    // 走査対象が空なら、この検査は永遠に緑を返す
    expect(tableRows().length).toBe(SCENARIOS.length);
  });

  it("シナリオ ID の集合が一致する", () => {
    expect(new Set(tableRows().map((r) => r.id))).toEqual(new Set(SCENARIOS.map((s) => s.id)));
  });

  it("場面数と難易度が一致する", () => {
    for (const row of tableRows()) {
      const s = SCENARIOS.find((x) => x.id === row.id)!;
      expect(row.events, `${row.id} の場面数`).toBe(s.events.length);
      expect(row.stars, `${row.id} の難易度`).toBe(s.difficulty);
    }
  });

  it("陽性対照: 数を一つ変えた表は落ちる", () => {
    // 検算そのものを検算する(HC-041)。README を書き換えず、行を作って当てる
    const fake = `| ${SCENARIOS[0].id} | x | ★ | ${SCENARIOS[0].events.length + 1} |`;
    const m = /^\|\s*([A-Z]{2}\d{2})\s*\|([^|]*)\|\s*([★☆]+)\s*\|\s*(\d+)\s*\|/.exec(fake)!;
    expect(Number(m[4])).not.toBe(SCENARIOS[0].events.length);
  });
});

describe("T-081 SPEC と実装の対応(HC-157)", () => {
  const SPEC = readFileSync(join(process.cwd(), "SPEC.md"), "utf8");
  const TEST_SPEC = readFileSync(join(process.cwd(), "TEST_SPEC.md"), "utf8");

  it("SPEC の各 G-xx が TEST_SPEC のケース表から参照されるか、未実装と明記されている", () => {
    const gates = [...SPEC.matchAll(/\bG-(\d{2})\b/g)].map((m) => `G-${m[1]}`);
    const declared = new Set(gates);
    expect(declared.size).toBeGreaterThan(0);
    const unreferenced: string[] = [];
    for (const g of declared) {
      const inTests = TEST_SPEC.includes(g);
      const markedUnimplemented = new RegExp(`${g}[^\\n]*未実装`).test(SPEC);
      if (!inTests && !markedUnimplemented) unreferenced.push(g);
    }
    expect(unreferenced).toEqual([]);
  });

  it("TEST_SPEC の各 T-xxx がテストファイルのどこかに現れる", () => {
    const ids = [...TEST_SPEC.matchAll(/\bT-(\d{3})\b/g)].map((m) => `T-${m[1]}`);
    const declared = [...new Set(ids)];
    expect(declared.length).toBeGreaterThan(0);
    const sources = ["tests", "tests/validation", "tests/ui"]
      .flatMap((d) => {
        try {
          return require("node:fs")
            .readdirSync(join(process.cwd(), d))
            .filter((f: string) => f.endsWith(".test.ts") || f.endsWith(".test.tsx"))
            .map((f: string) => readFileSync(join(process.cwd(), d, f), "utf8"));
        } catch {
          return [];
        }
      })
      .join("\n");
    const missing = declared.filter((t) => !sources.includes(t));
    expect(missing).toEqual([]);
  });
});
