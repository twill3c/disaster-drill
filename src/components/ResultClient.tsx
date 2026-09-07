"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RANK_LABEL, evaluate } from "@/core/scoring";
import { STAT_KEYS, alternatives, findEvent } from "@/core/simulation";
import type { Scenario } from "@/core/types";
import { STAT_LABEL, formatTime } from "@/components/StatusPanel";
import { findScenario } from "@/data";
import { loadHandoff, type Handoff } from "@/lib/handoff";
import { browserStorage, loadStore, recordResult, saveStore } from "@/lib/storage";

/** 結果画面(F-09 / 元仕様 §22〜§24)。 */
export function ResultClient() {
  const [handoff, setHandoff] = useState<Handoff | null | undefined>(undefined);
  const [saved, setSaved] = useState<boolean | null>(null);

  useEffect(() => {
    setHandoff(loadHandoff());
  }, []);

  const scenario = handoff ? findScenario(handoff.run.scenarioId) : undefined;

  const result = useMemo(() => {
    if (!handoff || !scenario) return null;
    return evaluate(handoff.run, scenario);
  }, [handoff, scenario]);

  // 記録の保存(F-10)。保存できなくても訓練の結果は表示する
  useEffect(() => {
    if (!handoff || !scenario || !result) return;
    const storage = browserStorage();
    if (!storage) {
      setSaved(false);
      return;
    }
    const store = loadStore(storage);
    const next = recordResult(store, {
      scenarioId: scenario.id,
      mode: handoff.mode,
      score: Math.floor(result.score),
      rank: result.rank,
      playedAt: handoff.finishedAt,
      seed: handoff.seed,
    });
    setSaved(saveStore(storage, next));
  }, [handoff, scenario, result]);

  if (handoff === undefined) {
    return (
      <main>
        <p className="muted">読み込んでいます…</p>
      </main>
    );
  }

  if (!handoff || !scenario || !result) {
    return (
      <main>
        <h1>結果がありません</h1>
        <p className="small muted">
          訓練の記録が見つかりませんでした。もう一度訓練を行ってください。
        </p>
        <Link className="btn btn--primary" href="/scenarios">
          シナリオ一覧へ
        </Link>
      </main>
    );
  }

  const { run } = handoff;
  const alts = alternatives(run, scenario);
  const score = Math.floor(result.score);

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <p className="topbar__title">
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
              防災訓練シミュレーター
            </Link>
          </p>
          <span className="topbar__meta">結果</span>
        </div>
      </header>

      <main>
        <div className="panel">
          <p className="small muted" style={{ margin: 0, textAlign: "center" }}>
            TRAINING COMPLETE ・ {scenario.title}
          </p>
          <div className="score">
            <div className="score__value">
              {score}
              <span className="score__unit">点</span>
            </div>
            <div className={`score__rank rank-${result.rank}`}>{result.rank}</div>
            <p className="small muted" style={{ margin: 0 }}>
              {RANK_LABEL[result.rank]}
            </p>
          </div>

          <table className="table">
            <caption className="visually-hidden">最終的な各指標の値</caption>
            <tbody>
              {STAT_KEYS.map((k) => (
                <tr key={k}>
                  <th scope="row">{STAT_LABEL[k]}</th>
                  <td className="num">{Math.round(run.state[k])}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">経過時間</th>
                <td className="num">{formatTime(run.state.time)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="panel">
          <h2>良かった判断</h2>
          {result.good.length === 0 ? (
            <p className="small muted">この訓練では、安全側の判断が記録されませんでした。</p>
          ) : (
            <ul className="small">
              {result.good.map((g, i) => (
                <li key={`${g.eventId}-${i}`}>
                  <strong>{g.label}</strong>
                  <br />
                  {g.explanation}
                </li>
              ))}
            </ul>
          )}

          <h2>改善ポイント</h2>
          {result.improve.length === 0 ? (
            <p className="small muted">危険度の高い判断はありませんでした。</p>
          ) : (
            <ul className="small">
              {result.improve.map((g, i) => (
                <li key={`${g.eventId}-${i}`}>
                  <strong>{g.label}</strong>
                  <br />
                  {g.explanation}
                </li>
              ))}
            </ul>
          )}
          {result.slow && (
            <p className="small" style={{ color: "var(--warn)" }}>
              避難の判断に時間がかかりました。同じ判断でも、早いほど安全です。
            </p>
          )}
          {result.timedOutCount > 0 && (
            <p className="small" style={{ color: "var(--warn)" }}>
              時間切れで自動的に選ばれた行動が {result.timedOutCount} 回ありました。
            </p>
          )}
        </section>

        <section className="panel">
          <h2>もし別の行動をしていたら</h2>
          <p className="small muted">
            各場面で、選ばなかった行動をその時点の状態に当てはめた場合の安全度です。
            行動の因果関係を確かめるための比較で、実際の結末を再現したものではありません。
          </p>
          {alts.map((alt) => {
            const ev = findEvent(scenario, alt.eventId);
            const chosen = ev?.actions.find((a) => a.id === alt.chosenActionId);
            return (
              <div key={alt.eventId} style={{ marginBottom: "0.9rem" }}>
                <p className="small" style={{ margin: "0 0 0.2rem" }}>
                  <strong>{ev?.title}</strong>
                </p>
                <div className="compare">
                  <span className="compare__mine">
                    あなたの選択: {chosen?.label ?? alt.chosenActionId}
                  </span>
                  <span className="compare__num compare__mine">{alt.chosenSafety}</span>
                  {alt.others.map((o) => (
                    <Fragmentish key={o.actionId} label={o.label} value={o.safety} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <section className="panel">
          <h2>行動履歴</h2>
          <ol className="timeline">
            {run.history.map((h, i) => {
              const ev = findEvent(scenario, h.eventId);
              const act = ev?.actions.find((a) => a.id === h.actionId);
              return (
                <li key={`${h.eventId}-${i}`}>
                  <div className="timeline__time">{formatTime(h.before.time)}</div>
                  <div className="small">
                    <strong>{ev?.title}</strong> — 「{act?.label ?? h.actionId}」を選択
                    {h.timedOut && <span className="muted">(時間切れ)</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="panel">
          <h2>防災ポイント</h2>
          <ul className="small">
            {tipsOf(run.history.map((h) => h.eventId), scenario).map((t) => (
              <li key={t.id} style={{ marginBottom: "0.5rem" }}>
                <strong>{t.title}</strong>
                <br />
                {t.tip}
              </li>
            ))}
          </ul>
        </section>

        <div className="stack">
          <Link className="btn btn--primary" href={`/play?scenario=${scenario.id}`}>
            もう一度挑戦する
          </Link>
          <Link className="btn btn--inline" href="/scenarios">
            別のシナリオ
          </Link>
          <Link className="btn btn--inline" href="/records">
            成績を見る
          </Link>
        </div>

        {saved === false && (
          <p className="small muted">
            成績保存機能を利用できません。訓練自体は続けられます。
          </p>
        )}
      </main>
    </>
  );
}

function Fragmentish({ label, value }: { label: string; value: number }) {
  return (
    <>
      <span className="muted">別の選択: {label}</span>
      <span className="compare__num muted">{value}</span>
    </>
  );
}

function tipsOf(eventIds: string[], scenario: Scenario) {
  const seen = new Set<string>();
  const out: { id: string; title: string; tip: string }[] = [];
  for (const id of eventIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const ev = findEvent(scenario, id);
    if (ev?.tip) out.push({ id, title: ev.title, tip: ev.tip });
  }
  return out;
}
