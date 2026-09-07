"use client";

import { useEffect, useState } from "react";

import { browserStorage, loadStore, saveStore } from "@/lib/storage";

/**
 * チュートリアル(F-22 / 元仕様 §40)。**初回起動時のみ**表示し、
 * 既読は F-10 の設定に保存する。
 *
 * localStorage が使えない環境では毎回出る —— 訓練そのものは続けられるので、
 * それでよい(元仕様 §46 の方針)。
 */
const STEPS = [
  "状況を読む",
  "行動を選ぶ",
  "結果を見る",
  "評価を確認する",
  "再挑戦する",
] as const;

export function Tutorial() {
  // undefined = まだ判定していない(事前描画では出さない)
  const [show, setShow] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const s = browserStorage();
    if (!s) {
      setShow(true);
      return;
    }
    setShow(!loadStore(s).settings.tutorialSeen);
  }, []);

  const dismiss = () => {
    setShow(false);
    const s = browserStorage();
    if (!s) return;
    const store = loadStore(s);
    saveStore(s, { ...store, settings: { ...store.settings, tutorialSeen: true } });
  };

  if (show !== true) return null;

  return (
    <section className="panel" aria-labelledby="tutorial-heading">
      <h2 id="tutorial-heading">はじめての方へ</h2>
      <p className="small muted" style={{ marginBottom: "0.5rem" }}>
        30秒で分かる進め方です。
      </p>
      <ol className="small" style={{ margin: "0 0 0.8rem", paddingLeft: "1.4rem" }}>
        {STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <button type="button" className="btn btn--inline" onClick={dismiss}>
        分かりました
      </button>
    </section>
  );
}
