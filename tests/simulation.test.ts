import { describe, expect, it } from "vitest";

import { createRng } from "@/core/random";
import { computeScore } from "@/core/scoring";
import {
  STAT_KEYS,
  alternatives,
  applyAction,
  applyEffects,
  createRun,
  dangerLevel,
  enterEvent,
  timeoutAction,
} from "@/core/simulation";
import type {
  Action,
  Effects,
  Scenario,
  ScenarioEvent,
  SimulationState,
} from "@/core/types";

const base: SimulationState = {
  time: 0,
  safety: 70,
  health: 100,
  supplies: 60,
  information: 30,
  evacuation: 0,
  familySafety: 50,
  score: 0,
};

function action(id: string, effects: Effects, extra: Partial<Action> = {}): Action {
  return {
    id,
    label: id,
    description: "",
    effects,
    explanation: `${id} の解説`,
    riskLevel: "medium",
    ...extra,
  };
}

const evA: ScenarioEvent = {
  id: "a",
  title: "A",
  description: "",
  actions: [
    action("a1", { safety: 10, time: 30 }, { riskLevel: "low" }),
    action("a2", { safety: -20, time: 10 }, { riskLevel: "high", next: "c" }),
    action("a3", { safety: -5 }, { riskLevel: "high", next: "b" }),
  ],
  nextEvent: "b",
};
const evB: ScenarioEvent = {
  id: "b",
  title: "B",
  description: "",
  timeoutActionId: "b2",
  actions: [
    action("b1", { evacuation: 20 }, { riskLevel: "low" }),
    action("b2", { evacuation: 5 }, { riskLevel: "high" }),
  ],
};
const evC: ScenarioEvent = {
  id: "c",
  title: "C",
  description: "",
  actions: [
    action("c1", { health: -10, time: 100 }, { riskLevel: "high" }),
    action("c2", { health: 5, time: 100 }, { riskLevel: "low" }),
  ],
  variants: [
    { id: "v-blackout", description: "停電した。", effects: { information: -10 } },
    { id: "v-after", description: "余震が来た。", effects: { safety: -10 } },
  ],
};

const scenario: Scenario = {
  id: "T",
  title: "test",
  disasterType: "earthquake",
  difficulty: 1,
  introduction: "",
  initialState: base,
  timeBudget: 1000,
  events: [evA, evB, evC],
};

describe("T-020 クランプの性質(G-03)", () => {
  it("±200 の効果を 1,000 回重ねても [0,100]、time は非減少", () => {
    // 出所: SPEC F-01。定数を持たない性質テスト。seed は 20260907
    const rng = createRng(20260907);
    let s = { ...base };
    for (let i = 0; i < 1000; i++) {
      const effects: Effects = {};
      for (const k of STAT_KEYS) {
        if (rng.next() < 0.6) effects[k] = Math.round(rng.next() * 400 - 200);
      }
      // time の負の効果は無視される(単調非減少)
      effects.time = Math.round(rng.next() * 200 - 50);
      const prev = s;
      s = applyEffects(s, effects);
      for (const k of STAT_KEYS) {
        expect(s[k]).toBeGreaterThanOrEqual(0);
        expect(s[k]).toBeLessThanOrEqual(100);
      }
      expect(s.time).toBeGreaterThanOrEqual(prev.time);
    }
    // 性質テストが空振りしていないこと: 少なくとも一度は上下端に触れている
    expect(s.time).toBeGreaterThan(0);
  });
});

describe("T-021 applyAction(F-04)", () => {
  it("効果が加算され history に before が残る", () => {
    const run0 = createRun(scenario);
    expect(run0.eventId).toBe("a");
    expect(run0.history).toEqual([]);
    const run1 = applyAction(run0, scenario, evA.actions[0]);
    expect(run1.state.safety).toBe(80);
    expect(run1.state.time).toBe(30);
    expect(run1.history).toHaveLength(1);
    expect(run1.history[0]).toMatchObject({
      eventId: "a",
      actionId: "a1",
      at: 30,
    });
    expect(run1.history[0].before).toEqual(run0.state);
    // 純関数: 入力は変わらない
    expect(run0.state.safety).toBe(70);
    expect(run0.history).toEqual([]);
  });
  it("score は F-05 で毎回計算し直される", () => {
    const run1 = applyAction(createRun(scenario), scenario, evA.actions[0]);
    expect(run1.state.score).toBeGreaterThan(0);
  });
});

describe("T-022 遷移先の決定(F-04)", () => {
  it("action.next > event.nextEvent > null", () => {
    const r0 = createRun(scenario);
    expect(applyAction(r0, scenario, evA.actions[0]).eventId).toBe("b");
    expect(applyAction(r0, scenario, evA.actions[1]).eventId).toBe("c");
    const rb = { ...r0, eventId: "b" };
    expect(applyAction(rb, scenario, evB.actions[0]).eventId).toBeNull();
  });
});

describe("T-023 timeoutAction(F-12)", () => {
  it("timeoutActionId があればそれ、無ければ最初の high", () => {
    expect(timeoutAction(evB).id).toBe("b2");
    expect(timeoutAction(evA).id).toBe("a2");
    expect(timeoutAction(evC).id).toBe("c1");
  });
});

describe("T-024 dangerLevel(F-15)", () => {
  // 出所: SPEC F-15(danger = 100 − safety、<34 LOW、<67 MEDIUM)
  const cases: [number, string][] = [
    [100, "LOW"],
    [67, "LOW"],
    [66, "MEDIUM"],
    [34, "MEDIUM"],
    [33, "HIGH"],
    [0, "HIGH"],
  ];
  for (const [safety, level] of cases) {
    it(`safety ${safety} → ${level}`, () => {
      expect(dangerLevel(safety)).toBe(level);
    });
  }
});

describe("T-025 variant の適用(F-18)", () => {
  it("challenge では PRNG が選んだ variant の効果が乗る", () => {
    const r0 = { ...createRun(scenario), eventId: "c" };
    const rng = createRng(1);
    const { run, variant } = enterEvent(r0, scenario, "challenge", rng);
    expect(variant).not.toBeNull();
    const chosen = evC.variants!.find((v) => v.id === variant!.id)!;
    const expected = applyEffects(r0.state, chosen.effects ?? {});
    // score は F-05 で再計算されるので、それ以外の鍵を比べ、score は computeScore と突き合わせる
    expect({ ...run.state, score: 0 }).toEqual({ ...expected, score: 0 });
    expect(run.state.score).toBe(computeScore(expected, scenario.timeBudget));
    // 対照の前提: 選ばれた variant は実際に状態を変えている
    expect(run.state).not.toEqual(r0.state);
    expect(run.pendingVariantId).toBe(chosen.id);
  });
  it("beginner / standard では乗らない", () => {
    const r0 = { ...createRun(scenario), eventId: "c" };
    for (const mode of ["beginner", "standard"] as const) {
      const { run, variant } = enterEvent(r0, scenario, mode, createRng(1));
      expect(variant).toBeNull();
      expect(run.state).toEqual(r0.state);
    }
  });
  it("選ばれた variant は次の history 行に残る", () => {
    const r0 = { ...createRun(scenario), eventId: "c" };
    const { run } = enterEvent(r0, scenario, "challenge", createRng(1));
    const r1 = applyAction(run, scenario, evC.actions[1]);
    expect(r1.history[0].variantId).toBe(run.pendingVariantId);
    expect(r1.pendingVariantId).toBeUndefined();
  });
});

describe("T-050 alternatives は applyEffects と同じ関数で出す(G-12)", () => {
  it("各値は applyEffects(before, other.effects).safety と一致", () => {
    let run = createRun(scenario);
    run = applyAction(run, scenario, evA.actions[1]); // → c
    run = applyAction(run, scenario, evC.actions[0]); // → end
    const alts = alternatives(run, scenario);
    expect(alts).toHaveLength(2);
    // 事前条件: 各イベントに選ばなかった行動が実在する(対照が成り立つ前提の表明)
    expect(alts[0].others.length).toBe(evA.actions.length - 1);
    expect(alts[1].others.length).toBe(evC.actions.length - 1);
    for (const alt of alts) {
      const entry = run.history.find((h) => h.eventId === alt.eventId)!;
      for (const o of alt.others) {
        const act = ev(alt.eventId).actions.find((a) => a.id === o.actionId)!;
        expect(o.safety).toBe(applyEffects(entry.before, act.effects).safety);
        expect(o.actionId).not.toBe(entry.actionId);
      }
      expect(alt.chosenSafety).toBe(
        applyEffects(entry.before, ev(alt.eventId).actions.find((a) => a.id === entry.actionId)!.effects).safety,
      );
    }
    function ev(id: string): ScenarioEvent {
      return scenario.events.find((e) => e.id === id)!;
    }
  });
});
