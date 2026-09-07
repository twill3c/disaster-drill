#!/usr/bin/env python3
"""prose_check.py — 本アプリの日本語本文に対する二つの検査(プロジェクト所有)。

**なぜ要るのか。**

1. スキャフォールドが配る `harness/text_hygiene.py` は `SKIP_DIRS` に `data` を持つ。
   本アプリの日本語本文は全量が `src/data/*.ts` にあるので、既定の走査から外れる。
   実測(2026-09-07): 既定の走査対象 22 ファイルのうち `src/data` は 0 件。
   管理ファイルには手を入れず、**明示のファイル引数**で同じ検査器に渡す(HC-121 追加証拠 3)。

2. 字種検査は別字種と制御文字しか見ない。`water` のような**正当な文字で書かれた誤り**は通る。
   実際に loop_001 で「がけからの water 湧き水の濁り」を書いた。
   そこで **日本語の文中に単独で現れた ASCII 語**を出す狭い検査を足す。
   語彙を絞らず「全部出して、正当なものを許可一覧に置く」向きにしてあるのは、
   このアプリの本文が閉じた集合(自作のシナリオ)だからである。

終了コード: 違反 0 件で 0、1 件以上で 1。自己対照に失敗したら 2。
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 本文が入っている場所。ここを増やしたら PROSE_GLOBS も見直す
PROSE_GLOBS = ["src/data/*.ts", "src/components/*.tsx", "src/app/**/*.tsx"]

# 日本語の文の中に出てよい ASCII 語。**実在の固有名詞・単位・記法だけ**を置く。
# 広げると検査が骨抜きになるので、足すときは「なぜ日本語で書けないか」を書くこと。
ALLOWED_WORDS = {
    "MIT", "License", "GitHub", "App", "Menu",  # フッタ規約の文言(F-21)
    "SVG", "HTML", "CSS", "UI",                 # 画面の説明で使う技術語
    "px", "rem",                                # CSS の単位
    "SNS",                                      # 日本語で定着した略語。「交流サイト」では通じない
    "Disaster", "Drill",                        # このアプリの英語名(題と見出しに並記する)
    "TRAINING", "COMPLETE",                     # 結果画面の見出し(元仕様 §22 の画面案)
}

JAPANESE = re.compile("[぀-ヿ一-鿿]")
# 日本語文字に隣接するか、日本語文字を含む文字列の中の孤立した ASCII 語。
# 識別子(`foo.bar` / `foo-bar` / `foo_bar`)の一部は撃たない
ASCII_WORD = re.compile(r"(?<![A-Za-z0-9_./\-])[A-Za-z]{2,}(?![A-Za-z0-9_./\-])")
# 文字列リテラル。TypeScript のダブルクォート文字列だけを見る
STRING_LITERAL = re.compile(r'"([^"\\\n]*)"')


def stray_words(text: str) -> list[str]:
    """日本語を含む文字列リテラルの中の、許可されていない ASCII 語を返す。"""
    out: list[str] = []
    for m in STRING_LITERAL.finditer(text):
        body = m.group(1)
        if not JAPANESE.search(body):
            continue
        for w in ASCII_WORD.finditer(body):
            if w.group(0) not in ALLOWED_WORDS:
                out.append(w.group(0))
    return out


def self_test() -> list[str]:
    """検査器自身の陽性・陰性対照。これが通らないうちは走査に入らない(HC-041)。"""
    errs: list[str] = []
    positives = [
        ('const a = "がけからの water 湧き水";', "water"),
        ('label: "避難所へ go する",', "go"),
    ]
    for src, want in positives:
        if want not in stray_words(src):
            errs.append(f"陽性対照が捕まらない: {want}")
    negatives = [
        'const a = "ふつうの日本語だけの文です。";',           # 混入なし
        'id: "eq-shake",',                                    # 日本語を含まない識別子
        'href: "https://example.com/path",',                  # URL
        'const a = "MIT License の表示";',                     # 許可語
        'const a = "SVG で描いた図";',                         # 許可語
        'riskLevel: "low",',                                  # 日本語を含まない値
    ]
    for src in negatives:
        got = stray_words(src)
        if got:
            errs.append(f"陰性対照を撃った: {src[:40]} → {got}")
    return errs


def prose_files() -> list[Path]:
    seen: list[Path] = []
    for pattern in PROSE_GLOBS:
        for p in sorted(ROOT.glob(pattern)):
            if p.is_file() and p not in seen:
                seen.append(p)
    return seen


def main() -> int:
    errs = self_test()
    if errs:
        print("検査器の自己対照に失敗:", file=sys.stderr)
        for e in errs:
            print(f"  - {e}", file=sys.stderr)
        return 2

    files = prose_files()
    if not files:
        print("走査対象が 0 件。PROSE_GLOBS が実態と合っていない", file=sys.stderr)
        return 2

    failed = False

    # (1) 共通の字種・制御文字検査に、明示のファイル引数で渡す
    rel = [str(p.relative_to(ROOT)) for p in files]
    r = subprocess.run(
        [sys.executable, str(ROOT / "harness" / "text_hygiene.py"), *rel],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    print(f"字種・制御文字: {r.stdout.strip()}")
    if r.returncode != 0:
        print(r.stdout, r.stderr, file=sys.stderr)
        failed = True

    # (2) 日本語文中の孤立した ASCII 語
    hits = 0
    for p in files:
        for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
            for w in stray_words(line):
                print(f"  {p.relative_to(ROOT)}:{i} 日本語の文に ASCII 語「{w}」")
                hits += 1
    print(f"英単語混入: 走査 {len(files)} ファイル / 違反 {hits} 件")
    if hits:
        failed = True

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
