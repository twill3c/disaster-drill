import { describe, expect, it } from "vitest";

import {
  HISTORY_LIMIT,
  STORAGE_KEY,
  defaultStore,
  loadStore,
  recordResult,
  saveStore,
  type PlayRecord,
  type StorageLike,
} from "@/lib/storage";

// 出所: SPEC F-10(キー名・保存対象・履歴 20 件・壊れた値は初期値)

function memory(initial: Record<string, string> = {}): StorageLike & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

function rec(over: Partial<PlayRecord> = {}): PlayRecord {
  return {
    scenarioId: "EQ01",
    mode: "standard",
    score: 87,
    rank: "A",
    playedAt: "2026-09-07T00:00:00Z",
    ...over,
  };
}

describe("T-040 往復(G-06)", () => {
  it("recordResult → save → load で同値", () => {
    const st = memory();
    const s1 = recordResult(defaultStore(), rec());
    expect(saveStore(st, s1)).toBe(true);
    expect(st.map.has(STORAGE_KEY)).toBe(true);
    expect(loadStore(st)).toEqual(s1);
  });
});

describe("T-041 壊れた値は初期値(G-06)", () => {
  const bad = ["{not json", "null", "[]", '"str"', '{"bestScore":"x"}', '{"history":5}'];
  for (const v of bad) {
    it(`${v} → 初期値`, () => {
      expect(loadStore(memory({ [STORAGE_KEY]: v }))).toEqual(defaultStore());
    });
  }
  it("未保存 → 初期値", () => {
    expect(loadStore(memory())).toEqual(defaultStore());
  });
});

describe("T-042 集計(G-06)", () => {
  it("最高点は max、クリア回数 +1、災害別ランクは最良、履歴は最新 N 件", () => {
    let s = defaultStore();
    s = recordResult(s, rec({ score: 60, rank: "C" }));
    s = recordResult(s, rec({ score: 92, rank: "S" }));
    s = recordResult(s, rec({ score: 75, rank: "B" }));
    s = recordResult(s, rec({ scenarioId: "FI01", score: 81, rank: "A" }));
    expect(s.bestScore).toBe(92);
    expect(s.clears).toBe(4);
    expect(s.bestByScenario.EQ01).toEqual({ score: 92, rank: "S" });
    expect(s.bestByScenario.FI01).toEqual({ score: 81, rank: "A" });
    // 履歴は新しいものが先頭
    expect(s.history[0].scenarioId).toBe("FI01");
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) s = recordResult(s, rec({ score: i }));
    expect(s.history).toHaveLength(HISTORY_LIMIT);
    expect(s.history[0].score).toBe(HISTORY_LIMIT + 4);
  });
  it("設定は保持される", () => {
    const s = { ...defaultStore(), settings: { tutorialSeen: true } };
    const st = memory();
    saveStore(st, s);
    expect(loadStore(st).settings.tutorialSeen).toBe(true);
  });
});

describe("T-043 storage 不可(F-10)", () => {
  it("getItem が投げても初期値、setItem が投げても false", () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadStore(broken)).toEqual(defaultStore());
    expect(saveStore(broken, defaultStore())).toBe(false);
    expect(loadStore(null)).toEqual(defaultStore());
    expect(saveStore(null, defaultStore())).toBe(false);
  });
});
