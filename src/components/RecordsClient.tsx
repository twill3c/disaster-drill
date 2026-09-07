"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SCENARIOS, findScenario } from "@/data";
import { browserStorage, defaultStore, loadStore, type Store } from "@/lib/storage";

const MODE_LABEL: Record<string, string> = {
  beginner: "初心者",
  standard: "標準",
  challenge: "挑戦",
};

/** 自己ベストランキング(F-19 / 元仕様 §28)。外部 DB もオンライン順位も持たない。 */
export function RecordsClient() {
  const [store, setStore] = useState<Store | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    const s = browserStorage();
    if (!s) {
      setAvailable(false);
      setStore(defaultStore());
      return;
    }
    setStore(loadStore(s));
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <p className="topbar__title">
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
              防災訓練シミュレーター
            </Link>
          </p>
          <span className="topbar__meta">成績</span>
        </div>
      </header>

      <main>
        <h1>あなたの成績</h1>
        {!available && (
          <p className="notice small">
            成績保存機能を利用できません。訓練自体は続けられます。
          </p>
        )}

        {store === null ? (
          <p className="muted">読み込んでいます…</p>
        ) : (
          <>
            <div className="panel">
              <p style={{ margin: 0 }}>
                最高得点 <strong>{store.bestScore}</strong> 点 ・ 訓練回数{" "}
                <strong>{store.clears}</strong> 回
              </p>
            </div>

            <h2>災害別の自己ベスト</h2>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">シナリオ</th>
                  <th scope="col" className="num">
                    最高点
                  </th>
                  <th scope="col">ランク</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIOS.map((s) => {
                  const b = store.bestByScenario[s.id];
                  return (
                    <tr key={s.id}>
                      <th scope="row" style={{ fontWeight: 400 }}>
                        {s.title}
                      </th>
                      <td className="num">{b ? b.score : "—"}</td>
                      <td className={b ? `rank-${b.rank}` : "muted"}>{b ? b.rank : "未挑戦"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <h2>プレイ履歴</h2>
            {store.history.length === 0 ? (
              <p className="small muted">まだ記録がありません。</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">日時</th>
                    <th scope="col">シナリオ</th>
                    <th scope="col">モード</th>
                    <th scope="col" className="num">
                      点
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {store.history.map((h, i) => (
                    <tr key={`${h.playedAt}-${i}`}>
                      <td className="small">{h.playedAt.slice(0, 16).replace("T", " ")}</td>
                      <td className="small">
                        {findScenario(h.scenarioId)?.title ?? h.scenarioId}
                      </td>
                      <td className="small">{MODE_LABEL[h.mode] ?? h.mode}</td>
                      <td className="num">
                        {h.score} <span className={`rank-${h.rank}`}>{h.rank}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <p className="small muted">
              記録はこの端末のブラウザ内にのみ保存されます。個人情報は収集しません。
            </p>
          </>
        )}

        <div className="stack">
          <Link className="btn btn--primary" href="/scenarios">
            訓練を始める
          </Link>
        </div>
      </main>
    </>
  );
}
