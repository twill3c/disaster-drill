import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { COPYRIGHT, FOOTER_ITEMS } from "@/lib/footer";

// `next build` の後に verify.mjs から走る(TEST_SPEC 実行規約)。
// 出所: SPEC G-09 / G-10 / G-11 / N-05
//
// **経路は実測から取った**(HC-196)。`output: "export"` かつ `trailingSlash` 既定では
// 出力は `out/<route>.html` であって `out/<route>/index.html` ではない。
// 2026-09-07 に `ls out/` で実測した結果:
//   404.html  index.html  play.html  records.html  result.html  scenarios.html
//   index.txt play.txt records.txt result.txt scenarios.txt  _next/

const OUT = join(process.cwd(), "out");

/** 検査対象のページ。ルート名から出力ファイル名を導く(実測した規則) */
const ROUTES = ["", "scenarios", "records", "play", "result"];
const PAGES = ROUTES.map((r) => (r === "" ? "index.html" : `${r}.html`));

function html(p: string): string {
  return readFileSync(join(OUT, p), "utf8");
}

describe("T-092 ビルド成果(G-09)", () => {
  it("out/ に全ルートの HTML がある", () => {
    expect(existsSync(OUT)).toBe(true);
    for (const p of PAGES) expect(existsSync(join(OUT, p)), p).toBe(true);
  });
  it("走査対象が空でない(検査が空振りしていないこと)", () => {
    expect(readdirSync(OUT).filter((f) => f.endsWith(".html")).length).toBeGreaterThanOrEqual(
      PAGES.length,
    );
  });
});

describe("T-093 フッタ(G-10)", () => {
  // フリート規約のうち**共通で固定**なのは並びと項目数、そして 1 番目が MIT License、
  // その直後に地の文の ©、最後が App Menu であること。
  // **3・4 番目の文言はアプリ固有**なので、他アプリから写さず実装の定数から導く(HC-196)。
  const order = [
    FOOTER_ITEMS[0].label,
    COPYRIGHT,
    ...FOOTER_ITEMS.slice(1).map((i) => i.label),
  ];

  it("共通部分が規約どおり(写しではなく規約そのもの)", () => {
    expect(FOOTER_ITEMS).toHaveLength(5);
    expect(FOOTER_ITEMS[0].label).toBe("MIT License");
    expect(FOOTER_ITEMS[1].label).toBe("GitHub");
    expect(FOOTER_ITEMS[4].label).toBe("App Menu");
    expect(COPYRIGHT).toBe("© 2026 坂田哲朗");
    // 固有部分は文言を固定しないが、空でないことと他アプリの値でないことは見る
    expect(FOOTER_ITEMS[2].label.length).toBeGreaterThan(0);
    expect(FOOTER_ITEMS[3].label.length).toBeGreaterThan(0);
    expect(FOOTER_ITEMS[2].label).not.toBe(FOOTER_ITEMS[3].label);
  });

  for (const p of PAGES) {
    it(`${p} に並び順どおり在る`, () => {
      const h = html(p);
      let pos = -1;
      for (const needle of order) {
        const i = h.indexOf(needle, pos + 1);
        expect(i, `${needle} が ${p} に無い(前項の後ろに)`).toBeGreaterThan(pos);
        pos = i;
      }
    });
  }

  it("区切りの「・」が文字として在る(CSS ではなく)", () => {
    // 5 項目なら区切りは 4 つ。フッタの断片を切り出して数える
    const h = html("index.html");
    const start = h.indexOf("site-footer__inner");
    const end = h.indexOf("</footer>", start);
    expect(start).toBeGreaterThan(0);
    const footer = h.slice(start, end);
    expect((footer.match(/・/g) ?? []).length).toBe(FOOTER_ITEMS.length - 1);
  });
});

describe("T-094 免責(G-11)", () => {
  for (const p of ["index.html", "result.html"]) {
    it(`${p} に教育目的の注意がある`, () => {
      const h = html(p);
      expect(h).toContain("教育");
      expect(h).toContain("現地の指示");
    });
  }
});

describe("T-095 a11y 静的走査(N-05)", () => {
  // **訓練画面の a11y はここでは測れない。**`/play` はクエリでシナリオを受けるため
  // `useSearchParams` の Suspense 境界より内側が事前描画されず、`out/play.html` には
  // 待機表示しか入らない(2026-09-07 実測)。live 領域・行動ボタンの検査は
  // 実際に描画する `tests/ui/play.test.tsx`(T-100)が受け持つ。
  // ここで測るのは**事前描画される殻**の側だけである。
  it("play.html は事前描画された殻を持つ(空でない)", () => {
    const h = html("play.html");
    expect(h).toContain("<!DOCTYPE html>");
    expect(h.length).toBeGreaterThan(1000);
  });
  it("全ページに lang=ja が付く", () => {
    for (const p of PAGES) expect(html(p), p).toContain('lang="ja"');
  });
  it("シナリオ一覧の図に代替テキストが付く", () => {
    // 一覧は完全に事前描画されるので、ここは静的に測れる
    const h = html("scenarios.html");
    expect(h).toMatch(/role="img"/);
    expect(h).toMatch(/aria-label="[^"]*図"/);
  });
});
