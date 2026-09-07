import { describe, expect, it } from "vitest";

import {
  WEIGHTS,
  computeScore,
  evaluate,
  rankOf,
  timeScore,
} from "@/core/scoring";
import { applyAction, createRun } from "@/core/simulation";
import type { Scenario, SimulationState } from "@/core/types";

// 出所: SPEC F-05(元仕様 §13 の重み表)
function stateOf(v: number, time = 0): SimulationState {
  return {
    time,
    safety: v,
    health: v,
    supplies: v,
    information: v,
    evacuation: v,
    familySafety: v,
    score: 0,
  };
}

describe("T-010 重みの和と両端(G-01)", () => {
  it("重みの和は 1", () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
  });
  it("全指標 100・time 0 → 100 点", () => {
    expect(computeScore(stateOf(100), 3600)).toBe(100);
  });
  it("全指標 0・time ≥ budget → 0 点", () => {
    expect(computeScore(stateOf(0, 3600), 3600)).toBe(0);
    expect(computeScore(stateOf(0, 99999), 3600)).toBe(0);
  });
});

describe("T-011 ランク境界(G-02)", () => {
  // 出所: SPEC F-06(元仕様 §14)。境界の両側を全部置く
  const cases: [number, string][] = [
    [89, "A"],
    [90, "S"],
    [79, "B"],
    [80, "A"],
    [69, "C"],
    [70, "B"],
    [59, "D"],
    [60, "C"],
    [100, "S"],
    [0, "D"],
    [89.9, "A"], // 切り捨て後の整数で判定(F-06)
  ];
  for (const [score, rank] of cases) {
    it(`${score} → ${rank}`, () => {
      expect(rankOf(score)).toBe(rank);
    });
  }
});

describe("T-012 timeScore(F-05)", () => {
  it("0 → 100, budget → 0, 超過 → 0, 半分 → 50", () => {
    expect(timeScore(0, 1000)).toBe(100);
    expect(timeScore(1000, 1000)).toBe(0);
    expect(timeScore(5000, 1000)).toBe(0);
    expect(timeScore(500, 1000)).toBe(50);
  });
});

describe("T-013 evaluate(F-09)", () => {
  const scenario: Scenario = {
    id: "X",
    title: "x",
    disasterType: "earthquake",
    difficulty: 1,
    introduction: "",
    initialState: stateOf(50),
    timeBudget: 1000,
    events: [
      {
        id: "e1",
        title: "e1",
        description: "",
        actions: [
          {
            id: "good",
            label: "身を守る",
            description: "",
            effects: { safety: 10 },
            explanation: "良い",
            riskLevel: "low",
          },
          {
            id: "bad",
            label: "飛び出す",
            description: "",
            effects: { safety: -10 },
            explanation: "悪い",
            riskLevel: "high",
          },
        ],
        nextEvent: "e2",
      },
      {
        id: "e2",
        title: "e2",
        description: "",
        actions: [
          {
            id: "bad2",
            label: "戻る",
            description: "",
            effects: { safety: -10 },
            explanation: "悪い",
            riskLevel: "high",
          },
          {
            id: "mid",
            label: "待つ",
            description: "",
            effects: {},
            explanation: "中",
            riskLevel: "medium",
          },
        ],
      },
    ],
  };
  it("low は良かった判断、high は改善ポイントへ", () => {
    let run = createRun(scenario);
    run = applyAction(run, scenario, scenario.events[0].actions[0]);
    run = applyAction(run, scenario, scenario.events[1].actions[0]);
    const r = evaluate(run, scenario);
    expect(r.good.map((g) => g.actionId)).toEqual(["good"]);
    expect(r.improve.map((g) => g.actionId)).toEqual(["bad2"]);
    expect(r.score).toBe(computeScore(run.state, scenario.timeBudget));
    expect(r.rank).toBe(rankOf(r.score));
  });
});
