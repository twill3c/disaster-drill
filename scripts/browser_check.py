"""実ブラウザ検品(G-11 / G-12)。

**テストが緑でも動かないことがある。** モジュールの読み込み、`fetch` のパス、
段組みの溢れ、図の切れ —— どれも静的な検査では緑のまま通る(HC-138 / GEN-LAYOUT)。
ここでは本物の Chromium で各画面を開き、次を測る:

- コンソールのエラーと、失敗したネットワーク要求(ここが赤なら、画面は動いていない)
- **横溢れ**: `documentElement.scrollWidth` が `clientWidth` を超えないこと(G-12)。
  溢れている要素も名指しで出す
- **図の収まり**(G-11): SVG の中の要素が `viewBox` に収まっていること。
  図を持たない画面では対象 0 でよいが、**0 だったことを表示する**(黙って通さない)
- 画面ごとのスクリーンショット(手で見るため)

使い方:

    python harness/browser_check.py                # 既定の 7 画面
    python harness/browser_check.py --shot out/    # 画像も保存する
"""

from __future__ import annotations

import argparse
import http.server
import json
import re
import socketserver
import threading
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "out"

# 静的エクスポートの出力は `out/<route>.html`(実測 2026-09-07)。
# `?scenario=` 付きの経路も入れてあるのは、**訓練画面の中身がクエリで決まる**ため ——
# 素の `play.html` を開いても待機表示しか出ず、図もボタンも測れない。
PAGES = (
    "index.html",
    "scenarios.html",
    "records.html",
    "result.html",
    "play.html?scenario=EQ01",
    "play.html?scenario=FI01",
    "play.html?scenario=FL01",
    "play.html?scenario=TS01",
    "play.html?scenario=LS01",
)

VIEWPORTS = (("wide", 1280, 900), ("narrow", 390, 780))

# 横溢れの判定。**自前で横スクロールする入れ物の中身は溢れではない** ——
# 表や図は `overflow-x: auto` の中で横に流すのが正しい姿なので、そこを数えると
# 検査が常に赤になり、やがて誰も読まなくなる(2026-09-05 に一度そうなった)
OVERFLOW_JS = """
() => {
  const doc = document.documentElement;
  const over = [];
  const limit = doc.clientWidth + 1;
  const scrolls = (el) => {
    const ov = getComputedStyle(el).overflowX;
    return ov === 'auto' || ov === 'scroll';
  };
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= limit) continue;
    let inScroller = false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (scrolls(a)) { inScroller = true; break; }
    }
    if (inScroller) continue;
    over.push({ tag: el.tagName, cls: el.className, right: Math.round(r.right),
                text: (el.textContent || '').slice(0, 40) });
  }
  return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, over: over.slice(0, 6) };
}
"""

# **走査した数も返す。**違反 0 件は「図が正しい」と「図を見ていない」を区別しない ——
# `svg` を一つも掴めていなければ、この検査は永遠に緑を返す(AGENTS.md 品質ゲート)。
SVG_JS = """
() => {
  const out = [];
  let svgs = 0, scanned = 0;
  for (const svg of document.querySelectorAll('svg')) {
    const vb = svg.viewBox && svg.viewBox.baseVal;
    if (!vb || (!vb.width && !vb.height)) continue;
    svgs++;
    for (const el of svg.querySelectorAll('text, path, rect, line, circle, ellipse, g')) {
      let b;
      try { b = el.getBBox(); } catch (e) { continue; }
      if (!b || (b.width === 0 && b.height === 0)) continue;
      scanned++;
      if (b.x < vb.x - 0.5 || b.y < vb.y - 0.5 ||
          b.x + b.width > vb.x + vb.width + 0.5 ||
          b.y + b.height > vb.y + vb.height + 0.5) {
        out.push({ tag: el.tagName, text: (el.textContent || '').slice(0, 30),
                   bbox: [b.x, b.y, b.width, b.height],
                   viewBox: [vb.x, vb.y, vb.width, vb.height] });
      }
    }
  }
  return { svgs, scanned, out };
}
"""

# 図が在るべき画面。**ここが 0 なら検査ではなく画面のほうが壊れている**
PAGES_WITH_FIGURES = ("scenarios.html", "play.html")

# **棒が在るべき画面。**状態パネルは訓練を開始しないと出ないので、
# 訓練画面では実際に「訓練を始める」を押してから測る(下の `_advance`)。
# 押さずに測ると `棒 0 本` になり、検査は永遠に緑を返す —— loop_001 で一度そうなった。
PAGES_WITH_BARS = ("play.html",)

# **見えない棒を見つける。**`height` を与えた要素がインラインのままだと、
# 高さは行送りで決まり、指定した太さの帯は一本も描かれない。単体テストも
# 溢れ検査も緑のまま通る故障で、loop_001 では目視でしか見つからなかった。
# ここでは「棒であるはずの要素」の実測の高さを見て、潰れていたら落とす。
BARS_JS = """
() => {
  const sel = '.stat__bar, .stat__fill, .danger__meter, .danger__fill, .timer__bar, .timer__fill';
  const flat = [];
  let seen = 0;
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    seen++;
    // **指定した高さが実際に効いているか。**インライン要素の height は無視され、
    // 箱の高さは行送りで決まる —— 帯は指定より太くなり、しかも直前の行に重なって
    // 「棒に見えない」。実測(2026-09-07): height:6px の指定に対し 23.11px。
    const want = parseFloat(cs.height);
    const got = r.height;
    const inline = cs.display === 'inline';
    if (inline || (Number.isFinite(want) && want > 0 && Math.abs(got - want) > 1)) {
      flat.push({ cls: el.className, want: Math.round(want * 100) / 100,
                  got: Math.round(got * 100) / 100, display: cs.display });
    }
  }
  return { seen, flat };
}
"""


class _Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(WEB), **kw)

    def log_message(self, *a):  # 静かにする
        pass


@contextmanager
def serve():
    with socketserver.TCPServer(("127.0.0.1", 0), _Handler) as httpd:
        port = httpd.server_address[1]
        t = threading.Thread(target=httpd.serve_forever, daemon=True)
        t.start()
        try:
            yield f"http://127.0.0.1:{port}"
        finally:
            httpd.shutdown()


@contextmanager
def _base_url(external: str | None):
    """`--base` が無ければ手元の木を配って測る。あれば**本番**を測る。

    手元が緑でも本番が緑とは限らない —— 配られる木は除外設定で削られており、
    経路も配信も別物である。だから本番に対する検品を別に持つ。
    """
    if external:
        yield external.rstrip("/")
    else:
        with serve() as base:
            yield base


def _advance(page, page_name: str) -> str:
    """訓練画面は開始しないと状態パネルが出ない。押して、押せた証拠を返す。

    **押せなかったことを黙って通さない。**「操作したが変化なし」と
    「操作が届いていない」は、結果の見た目では区別できない(HC-138)。
    """
    if not page_name.startswith("play.html"):
        return "n/a"
    btn = page.get_by_role("button", name="訓練を始める")
    if btn.count() == 0:
        return "開始ボタンが無い"
    btn.first.click()
    page.wait_for_timeout(500)
    # 届いた証拠: 行動の選択肢が出ていること
    group = page.get_by_role("group", name="行動の選択肢")
    return "開始した" if group.count() > 0 else "押したが場面が出ない"


def check(
    shot_dir: Path | None = None,
    pages: tuple[str, ...] = PAGES,
    base_url: str | None = None,
) -> list[dict]:
    from playwright.sync_api import sync_playwright

    results: list[dict] = []
    with _base_url(base_url) as base, sync_playwright() as p:
        browser = p.chromium.launch()
        for name, width, height in VIEWPORTS:
            ctx = browser.new_context(viewport={"width": width, "height": height})
            for page_name in pages:
                page = ctx.new_page()
                errors: list[str] = []
                page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}")
                        if m.type in ("error", "warning") else None)
                page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
                page.on("requestfailed",
                        lambda r: errors.append(f"requestfailed: {r.url} {r.failure}"))
                page.goto(f"{base}/{page_name}", wait_until="networkidle")
                page.wait_for_timeout(400)
                advanced = _advance(page, page_name)
                overflow = page.evaluate(OVERFLOW_JS)
                svg = page.evaluate(SVG_JS)
                bars = page.evaluate(BARS_JS)
                title = page.title()
                if shot_dir is not None:
                    shot_dir.mkdir(parents=True, exist_ok=True)
                    # 問い合わせつきの URL も検品したいので、ファイル名に使えない字を潰す
                    # (Windows は `?` `=` `&` を受け付けず OSError になる)
                    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", page_name.replace(".html", ""))
                    page.screenshot(path=str(shot_dir / f"{stem}-{name}.png"), full_page=True)
                results.append(
                    {
                        "page": page_name,
                        "viewport": name,
                        "title": title,
                        "errors": errors,
                        "overflow": overflow,
                        "svg_out_of_viewbox": svg["out"],
                        "svg_scanned": svg["scanned"],
                        "svgs": svg["svgs"],
                        "bars_seen": bars["seen"],
                        "bars_flat": bars["flat"],
                        "advanced": advanced,
                    }
                )
                page.close()
            ctx.close()
        browser.close()
    return results


def summarise(results: list[dict]) -> tuple[str, bool]:
    lines = []
    ok = True
    for r in results:
        o = r["overflow"]
        overflowed = o["scrollWidth"] > o["clientWidth"] + 1
        # 図が在るべき画面で 1 枚も掴めていなければ、それ自体が不合格である
        expects_figure = any(r["page"].startswith(x) for x in PAGES_WITH_FIGURES)
        blind = expects_figure and r["svgs"] == 0
        expects_bars = any(r["page"].startswith(x) for x in PAGES_WITH_BARS)
        bar_blind = expects_bars and r["bars_seen"] == 0
        not_advanced = r["advanced"] not in ("n/a", "開始した")
        flat_bars = r["bars_flat"]
        bad = (
            bool(r["errors"])
            or overflowed
            or bool(r["svg_out_of_viewbox"])
            or blind
            or bool(flat_bars)
            or bar_blind
            or not_advanced
        )
        ok = ok and not bad
        flag = "NG" if bad else "ok"
        lines.append(
            f"[{flag}] {r['page']:24s} {r['viewport']:6s} "
            f"scroll {o['scrollWidth']}/{o['clientWidth']}  "
            f"err {len(r['errors'])}  はみ出し {len(o['over'])}  "
            f"図 {r['svgs']}枚/{r['svg_scanned']}要素 溢れ {len(r['svg_out_of_viewbox'])}  "
            f"棒 {r['bars_seen']}本/潰れ {len(flat_bars)}"
        )
        for x in flat_bars[:4]:
            lines.append(
                f"        = 棒の高さが効いていない .{x['cls']} "
                f"指定{x['want']}px → 実測{x['got']}px display={x['display']}"
            )
        if blind:
            lines.append("        # 図が在るはずの画面で svg を 1 枚も掴めていない")
        if bar_blind:
            lines.append("        = 棒が在るはずの画面で 1 本も掴めていない(検査が空振り)")
        if not_advanced:
            lines.append(f"        ! 訓練を開始できていない: {r['advanced']}")
        for e in r["errors"][:4]:
            lines.append(f"        ! {e[:160]}")
        for x in o["over"][:4]:
            lines.append(f"        > {x['tag']}.{x['cls']} right={x['right']} {x['text']!r}")
        for x in r["svg_out_of_viewbox"][:3]:
            lines.append(f"        # svg {x['tag']} {x['text']!r} bbox={x['bbox']}")
    return "\n".join(lines), ok


def main() -> int:
    ap = argparse.ArgumentParser(description="実ブラウザ検品(disaster-drill)")
    ap.add_argument("--shot", type=Path, help="スクリーンショットの保存先")
    ap.add_argument("--json", action="store_true", help="生の結果を JSON で出す")
    ap.add_argument("--base", help="本番など外部の URL を検品する(省略時は手元の web/)")
    args = ap.parse_args()
    results = check(shot_dir=args.shot, base_url=args.base)
    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return 0
    text, ok = summarise(results)
    print(text)
    print("\n判定:", "合格" if ok else "不合格")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
