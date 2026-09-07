/**
 * シミュレーションエンジン(F-01 / F-04 / F-09 / F-12 / F-15 / F-18)。
 * すべて純関数。入力を書き換えず、新しい値を返す。
 */

import type { Rng } from "./random";
import { computeScore } from "./scoring";
import type {
  Action,
  DangerLevel,
  Effects,
  EventVariant,
  HistoryEntry,
  Mode,
  Run,
  Scenario,
  ScenarioEvent,
  SimulationState,
  StatKey,
} from "./types";

export const STAT_KEYS: readonly StatKey[] = [
  "safety",
  "health",
  "supplies",
  "information",
  "evacuation",
  "familySafety",
];

export function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** 効果を加算してクランプする。time は負の効果を無視する(単調非減少) */
export function applyEffects(state: SimulationState, effects: Effects): SimulationState {
  const next: SimulationState = { ...state };
  for (const k of STAT_KEYS) {
    const d = effects[k];
    if (d) next[k] = clamp(state[k] + d);
  }
  const dt = effects.time ?? 0;
  if (dt > 0) next.time = state.time + dt;
  return next;
}

export function findEvent(scenario: Scenario, id: string | null): ScenarioEvent | undefined {
  if (id === null) return undefined;
  return scenario.events.find((e) => e.id === id);
}

/** 遷移先: action.next > event.nextEvent > null(終了) */
export function nextEventId(event: ScenarioEvent, action: Action): string | null {
  return action.next ?? event.nextEvent ?? null;
}

export function createRun(scenario: Scenario): Run {
  const state = { ...scenario.initialState };
  return {
    scenarioId: scenario.id,
    state: { ...state, score: computeScore(state, scenario.timeBudget) },
    eventId: scenario.events[0].id,
    history: [],
  };
}

/**
 * イベントに入る。Challenge では variants から PRNG で一つ選び、その効果を乗せる。
 * 選ばれた variant は `pendingVariantId` に置き、次の applyAction で history に移す。
 */
export function enterEvent(
  run: Run,
  scenario: Scenario,
  mode: Mode,
  rng: Rng,
): { run: Run; variant: EventVariant | null } {
  const event = findEvent(scenario, run.eventId);
  if (mode !== "challenge" || !event?.variants?.length) {
    return { run, variant: null };
  }
  const variant = rng.pick(event.variants);
  const state = applyEffects(run.state, variant.effects ?? {});
  return {
    run: {
      ...run,
      state: { ...state, score: computeScore(state, scenario.timeBudget) },
      pendingVariantId: variant.id,
    },
    variant,
  };
}

export function applyAction(
  run: Run,
  scenario: Scenario,
  action: Action,
  timedOut = false,
): Run {
  const event = findEvent(scenario, run.eventId);
  if (!event) return run;
  const state = applyEffects(run.state, action.effects);
  const entry: HistoryEntry = {
    eventId: event.id,
    actionId: action.id,
    before: run.state,
    at: state.time,
  };
  if (timedOut) entry.timedOut = true;
  if (run.pendingVariantId) entry.variantId = run.pendingVariantId;
  const { pendingVariantId: _drop, ...rest } = run;
  void _drop;
  return {
    ...rest,
    state: { ...state, score: computeScore(state, scenario.timeBudget) },
    eventId: nextEventId(event, action),
    history: [...run.history, entry],
  };
}

/** 時間切れで適用する行動(F-12) */
export function timeoutAction(event: ScenarioEvent): Action {
  if (event.timeoutActionId) {
    const a = event.actions.find((x) => x.id === event.timeoutActionId);
    if (a) return a;
  }
  const order = { high: 0, medium: 1, low: 2 } as const;
  return [...event.actions].sort((a, b) => order[a.riskLevel] - order[b.riskLevel])[0];
}

export function isFinished(run: Run): boolean {
  return run.eventId === null;
}

/** 危険度(F-15): danger = 100 − safety。<34 LOW、<67 MEDIUM、それ以上 HIGH */
export function dangerLevel(safety: number): DangerLevel {
  const danger = 100 - safety;
  if (danger < 34) return "LOW";
  if (danger < 67) return "MEDIUM";
  return "HIGH";
}

export interface Alternative {
  eventId: string;
  chosenActionId: string;
  chosenSafety: number;
  others: { actionId: string; label: string; safety: number }[];
}

/**
 * 「もし別の行動をしていたら」(F-09 / G-12)。各分岐点で選ばなかった行動を
 * 行動前の状態に 1 ステップだけ適用する。applyEffects と同じ関数で出す。
 */
export function alternatives(run: Run, scenario: Scenario): Alternative[] {
  const out: Alternative[] = [];
  for (const h of run.history) {
    const event = findEvent(scenario, h.eventId);
    if (!event) continue;
    const chosen = event.actions.find((a) => a.id === h.actionId);
    if (!chosen) continue;
    out.push({
      eventId: h.eventId,
      chosenActionId: h.actionId,
      chosenSafety: applyEffects(h.before, chosen.effects).safety,
      others: event.actions
        .filter((a) => a.id !== h.actionId)
        .map((a) => ({
          actionId: a.id,
          label: a.label,
          safety: applyEffects(h.before, a.effects).safety,
        })),
    });
  }
  return out;
}
