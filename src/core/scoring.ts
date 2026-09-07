/**
 * スコアリング(F-05 / F-06 / F-09)。元仕様 §13・§14。
 */

import type { Rank, Run, Scenario, SimulationState } from "./types";

/** 重み(元仕様 §13)。和は 1(G-01) */
export const WEIGHTS = {
  safety: 0.3,
  evacuation: 0.25,
  health: 0.15,
  information: 0.1,
  time: 0.1,
  familySafety: 0.1,
} as const;

/** 経過時間の少なさを 0〜100 に写す(F-05)。budget を超えたら 0 */
export function timeScore(time: number, timeBudget: number): number {
  if (timeBudget <= 0) return 0;
  return 100 * Math.max(0, 1 - time / timeBudget);
}

/** 0〜100 の実数。表示時に切り捨てる */
export function computeScore(state: SimulationState, timeBudget: number): number {
  const raw =
    state.safety * WEIGHTS.safety +
    state.evacuation * WEIGHTS.evacuation +
    state.health * WEIGHTS.health +
    state.information * WEIGHTS.information +
    timeScore(state.time, timeBudget) * WEIGHTS.time +
    state.familySafety * WEIGHTS.familySafety;
  // 浮動小数の丸め(0.3+0.25+... の累積誤差)で 100 が 99.99999 にならないよう 1e-9 で丸める
  return Math.round(raw * 1e9) / 1e9;
}

/** ランク(F-06)。切り捨て後の整数で判定 */
export function rankOf(score: number): Rank {
  const s = Math.floor(score);
  if (s >= 90) return "S";
  if (s >= 80) return "A";
  if (s >= 70) return "B";
  if (s >= 60) return "C";
  return "D";
}

export const RANK_LABEL: Record<Rank, string> = {
  S: "非常に優れた判断",
  A: "良好",
  B: "おおむね良好",
  C: "改善の余地あり",
  D: "防災行動を再確認",
};

export interface Judgement {
  eventId: string;
  actionId: string;
  label: string;
  explanation: string;
}

export interface Evaluation {
  score: number;
  rank: Rank;
  good: Judgement[];
  improve: Judgement[];
  /** 経過時間が timeBudget の 80% を超えたとき(元仕様 §22「避難判断に時間がかかった」) */
  slow: boolean;
  timedOutCount: number;
}

/** 結果画面の評価(F-09)。riskLevel low → 良かった判断、high → 改善ポイント */
export function evaluate(run: Run, scenario: Scenario): Evaluation {
  const good: Judgement[] = [];
  const improve: Judgement[] = [];
  let timedOutCount = 0;
  for (const h of run.history) {
    const event = scenario.events.find((e) => e.id === h.eventId);
    const action = event?.actions.find((a) => a.id === h.actionId);
    if (!event || !action) continue;
    if (h.timedOut) timedOutCount++;
    const j: Judgement = {
      eventId: event.id,
      actionId: action.id,
      label: action.label,
      explanation: action.explanation,
    };
    if (action.riskLevel === "low") good.push(j);
    else if (action.riskLevel === "high") improve.push(j);
  }
  const score = computeScore(run.state, scenario.timeBudget);
  return {
    score,
    rank: rankOf(score),
    good,
    improve,
    slow: run.state.time > scenario.timeBudget * 0.8,
    timedOutCount,
  };
}
