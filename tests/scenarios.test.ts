import { describe, expect, it } from "vitest";

import { SCENARIOS, findScenario } from "@/data";
import { nextEventId } from "@/core/simulation";
import type { Scenario, ScenarioEvent } from "@/core/types";

// 出所: SPEC N-03 / N-04 / F-16。すべて不変量で書き、件数の定数を持たない。

function eventMap(s: Scenario): Map<string, ScenarioEvent> {
  return new Map(s.events.map((e) => [e.id, e]));
}

/** 開始イベントから遷移を辿る。返り値は到達した ID の集合 */
function reachable(s: Scenario): Set<string> {
  const seen = new Set<string>();
  const stack = [s.events[0].id];
  const map = eventMap(s);
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const ev = map.get(id);
    if (!ev) continue;
    for (const a of ev.actions) {
      const n = nextEventId(ev, a);
      if (n) stack.push(n);
    }
  }
  return seen;
}

/** DFS で閉路を探す。見つかれば経路を返す */
function findCycle(s: Scenario): string[] | null {
  const map = eventMap(s);
  const color = new Map<string, 1 | 2>();
  const path: string[] = [];
  function visit(id: string): string[] | null {
    const c = color.get(id);
    if (c === 1) return [...path, id];
    if (c === 2) return null;
    color.set(id, 1);
    path.push(id);
    const ev = map.get(id);
    if (ev) {
      for (const a of ev.actions) {
        const n = nextEventId(ev, a);
        if (n) {
          const r = visit(n);
          if (r) return r;
        }
      }
    }
    path.pop();
    color.set(id, 2);
    return null;
  }
  return visit(s.events[0].id);
}

describe("T-034 ID の一意性と F-16 の集合", () => {
  it("シナリオ ID は F-16 の集合と一致する", () => {
    expect(new Set(SCENARIOS.map((s) => s.id))).toEqual(
      new Set(["EQ01", "FI01", "FL01", "TS01", "LS01"]),
    );
    expect(findScenario("EQ01")?.disasterType).toBe("earthquake");
    expect(findScenario("nope")).toBeUndefined();
  });
  for (const s of SCENARIOS) {
    it(`${s.id}: イベント ID とイベント内の行動 ID が一意`, () => {
      const ids = s.events.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const e of s.events) {
        const aids = e.actions.map((a) => a.id);
        expect(new Set(aids).size, `${s.id}/${e.id}`).toBe(aids.length);
      }
    });
  }
});

for (const s of SCENARIOS) {
  describe(`${s.id} ${s.title}`, () => {
    const map = eventMap(s);

    it("T-030 参照整合(G-04)", () => {
      for (const e of s.events) {
        if (e.nextEvent) expect(map.has(e.nextEvent), `${e.id}.nextEvent`).toBe(true);
        if (e.timeoutActionId)
          expect(
            e.actions.some((a) => a.id === e.timeoutActionId),
            `${e.id}.timeoutActionId`,
          ).toBe(true);
        for (const a of e.actions) {
          if (a.next) expect(map.has(a.next), `${e.id}/${a.id}.next`).toBe(true);
        }
      }
    });

    it("T-031 到達可能性(G-04)", () => {
      const r = reachable(s);
      const unreachable = s.events.map((e) => e.id).filter((id) => !r.has(id));
      expect(unreachable).toEqual([]);
    });

    it("T-032 非循環(G-04)", () => {
      expect(findCycle(s)).toBeNull();
    });

    it("T-033 終端保証: 各イベントに行動 ≥ 2、終端イベントが存在(G-04)", () => {
      // 非循環(T-032)+ 有限個のイベント ⇒ 全経路は有限。ここでは各段に選択が
      // あること(≥ 2)と、null に至るイベントが少なくとも一つあることを見る
      for (const e of s.events) {
        expect(e.actions.length, e.id).toBeGreaterThanOrEqual(2);
      }
      const terminal = s.events.filter((e) =>
        e.actions.some((a) => nextEventId(e, a) === null),
      );
      expect(terminal.length).toBeGreaterThan(0);
    });

    it("T-035 判断が効く: 行動間で safety の効果が同じでない(G-05)", () => {
      for (const e of s.events) {
        const vals = new Set(e.actions.map((a) => a.effects.safety ?? 0));
        expect(vals.size, `${s.id}/${e.id}`).toBeGreaterThan(1);
      }
    });

    it("T-036 分岐が最低 1 箇所ある(§4 目玉)", () => {
      const branching = s.events.filter((e) => {
        const dests = new Set(e.actions.map((a) => nextEventId(e, a)));
        return dests.size > 1;
      });
      expect(branching.length, s.id).toBeGreaterThan(0);
    });

    it("T-037 解説の存在(F-13)", () => {
      for (const e of s.events) {
        expect(Boolean(e.tip) || Boolean(e.info), `${e.id} に tip も info も無い`).toBe(true);
        for (const a of e.actions) {
          expect(a.explanation.trim().length, `${e.id}/${a.id}`).toBeGreaterThan(0);
          expect(a.label.trim().length, `${e.id}/${a.id}`).toBeGreaterThan(0);
        }
      }
    });

    it("初期状態は [0,100]、timeBudget > 0、先頭イベントが開始", () => {
      const st = s.initialState;
      for (const k of ["safety", "health", "supplies", "information", "evacuation", "familySafety"] as const) {
        expect(st[k]).toBeGreaterThanOrEqual(0);
        expect(st[k]).toBeLessThanOrEqual(100);
      }
      expect(st.time).toBe(0);
      expect(s.timeBudget).toBeGreaterThan(0);
      expect(s.events.length).toBeGreaterThanOrEqual(5);
    });
  });
}
