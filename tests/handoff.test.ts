import { afterEach, describe, expect, it, vi } from "vitest";

import { HANDOFF_KEY, loadHandoff, saveHandoff } from "@/lib/handoff";
import { COPYRIGHT, FOOTER_ITEMS, REPO } from "@/lib/footer";
import type { Run } from "@/core/types";

// 出所: SPEC F-09(訓練 → 結果の受け渡し)・F-21(フッタ規約)

const run: Run = {
  scenarioId: "EQ01",
  state: {
    time: 100,
    safety: 80,
    health: 90,
    supplies: 60,
    information: 40,
    evacuation: 30,
    familySafety: 70,
    score: 61,
  },
  eventId: null,
  history: [],
};

function withWindow(store: Record<string, string>, fn: () => void) {
  const g = globalThis as unknown as { window?: unknown };
  const prev = g.window;
  g.window = {
    sessionStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    },
  };
  try {
    fn();
  } finally {
    if (prev === undefined) delete g.window;
    else g.window = prev;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("T-070 受け渡しの往復(F-09)", () => {
  it("保存して読み戻せる", () => {
    const store: Record<string, string> = {};
    withWindow(store, () => {
      expect(saveHandoff({ run, mode: "standard", seed: "42", finishedAt: "2026-09-07T00:00:00Z" })).toBe(
        true,
      );
      expect(store[HANDOFF_KEY]).toBeTruthy();
      const h = loadHandoff();
      expect(h?.run.scenarioId).toBe("EQ01");
      expect(h?.mode).toBe("standard");
      expect(h?.seed).toBe("42");
    });
  });

  it("window が無ければ保存も読み出しもしない(サーバ側描画)", () => {
    const g = globalThis as unknown as { window?: unknown };
    const prev = g.window;
    delete g.window;
    try {
      expect(saveHandoff({ run, mode: "beginner", seed: "x", finishedAt: "t" })).toBe(false);
      expect(loadHandoff()).toBeNull();
    } finally {
      if (prev !== undefined) g.window = prev;
    }
  });

  it("未保存・壊れた値は null(F-46 の誤り処理)", () => {
    for (const raw of ["{not json", "null", '"str"', "5", '{"mode":"standard"}', '{"run":{}}']) {
      withWindow({ [HANDOFF_KEY]: raw }, () => {
        expect(loadHandoff(), raw).toBeNull();
      });
    }
    withWindow({}, () => {
      expect(loadHandoff()).toBeNull();
    });
  });

  it("history が配列でなければ受け付けない", () => {
    const bad = JSON.stringify({ run: { scenarioId: "EQ01", history: "nope" }, mode: "standard" });
    withWindow({ [HANDOFF_KEY]: bad }, () => {
      expect(loadHandoff()).toBeNull();
    });
  });

  it("sessionStorage が例外を投げても落ちない", () => {
    const g = globalThis as unknown as { window?: unknown };
    const prev = g.window;
    g.window = {
      sessionStorage: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("denied");
        },
      },
    };
    try {
      expect(saveHandoff({ run, mode: "beginner", seed: "x", finishedAt: "t" })).toBe(false);
      expect(loadHandoff()).toBeNull();
    } finally {
      if (prev === undefined) delete g.window;
      else g.window = prev;
    }
  });
});

describe("T-071 フッタ規約(F-21 / G-10)", () => {
  it("5 項目・並び・共通部分の文言", () => {
    expect(FOOTER_ITEMS).toHaveLength(5);
    expect(FOOTER_ITEMS.map((i) => i.label).slice(0, 2)).toEqual(["MIT License", "GitHub"]);
    expect(FOOTER_ITEMS[4].label).toBe("App Menu");
    expect(COPYRIGHT).toBe("© 2026 坂田哲朗");
  });
  it("全項目に遷移先がある", () => {
    for (const i of FOOTER_ITEMS) {
      expect(i.href.startsWith("https://"), i.label).toBe(true);
    }
    expect(FOOTER_ITEMS[1].href).toBe(REPO);
    expect(FOOTER_ITEMS[0].href).toContain("LICENSE");
  });

  it("3・4 番目は説明ページを指し、リポジトリの使い回しではない", () => {
    // 規約の 3・4 番目は各アプリ固有の解説ページである。作りかけの段階では
    // リポジトリを仮に指しておきがちで、そのまま出荷される
    // (loop_002 で実際にそうなっていた)。**別々の遷移先であること**まで見る。
    const [walk, plan] = [FOOTER_ITEMS[2], FOOTER_ITEMS[3]];
    for (const i of [walk, plan]) {
      expect(i.href, `${i.label} がリポジトリのまま`).not.toBe(REPO);
      expect(i.href.startsWith(REPO), `${i.label} がリポジトリ配下`).toBe(false);
    }
    expect(walk.href).not.toBe(plan.href);
  });
});
