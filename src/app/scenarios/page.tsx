import Link from "next/link";

import { DisasterScene } from "@/components/DisasterScene";
import { DISASTER_LABEL, SCENARIOS } from "@/data";

export const metadata = { title: "シナリオ一覧 — 防災訓練シミュレーター" };

const MODES = [
  {
    id: "beginner",
    name: "初心者",
    desc: "時間制限なし。行動ごとに解説を表示します。",
  },
  {
    id: "standard",
    name: "標準",
    desc: "時間制限あり。解説は結果画面でまとめて表示します。",
  },
  {
    id: "challenge",
    name: "挑戦",
    desc: "時間制限あり。状況にランダムな出来事が加わります。",
  },
] as const;

export default function Scenarios() {
  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <p className="topbar__title">
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
              防災訓練シミュレーター
            </Link>
          </p>
          <span className="topbar__meta">シナリオ一覧</span>
        </div>
      </header>

      <main>
        <h1>シナリオを選ぶ</h1>
        <p className="small muted">
          モードは各シナリオの開始画面で選べます。初めての方は初心者モードから。
        </p>

        <ul className="cards">
          {SCENARIOS.map((s) => (
            <li key={s.id}>
              <Link className="card" href={`/play?scenario=${s.id}`}>
                <DisasterScene type={s.disasterType} intensity={0.45} />
                <p className="card__title">{s.title}</p>
                <p className="card__meta">
                  {DISASTER_LABEL[s.disasterType]} ・ 難易度{" "}
                  {"★".repeat(s.difficulty)}
                  {"☆".repeat(5 - s.difficulty)} ・ 場面 {s.events.length}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <h2>訓練モード</h2>
        <ul className="small">
          {MODES.map((m) => (
            <li key={m.id}>
              <strong>{m.name}</strong> — {m.desc}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
