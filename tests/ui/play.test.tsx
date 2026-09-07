import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlayClient } from "@/components/PlayClient";
import { ResultClient } from "@/components/ResultClient";
import { findScenario } from "@/data";
import { HANDOFF_KEY, loadHandoff } from "@/lib/handoff";
import { STORAGE_KEY, loadStore } from "@/lib/storage";

/**
 * 画面の検査(元仕様 §45 の E2E に相当)。**在存ではなく振る舞いで書く**(HC-080):
 * 読み上げ名で掴み、実際に押し、状態の変化を確かめる。
 *
 * 出所: SPEC F-08 / F-09 / F-11 / F-12 / F-13 / N-05
 */

const push = vi.fn();
let query = "scenario=EQ01";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
  useRouter: () => ({ push }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: React.ComponentProps<"a">) => (
    <a href={href as string} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  push.mockClear();
  query = "scenario=EQ01";
  window.sessionStorage.clear();
  window.localStorage.clear();
});

afterEach(cleanup);

/** 訓練を開始し、最初の場面まで進める */
function startDrill(mode = "初心者") {
  render(<PlayClient />);
  fireEvent.click(screen.getByRole("button", { name: new RegExp(mode) }));
  fireEvent.click(screen.getByRole("button", { name: "訓練を始める" }));
}

describe("T-100 訓練画面の構造(F-08 / N-05)", () => {
  it("開始前から読み上げ用の live 領域が在る", () => {
    render(<PlayClient />);
    // **器は最初から在ること。**中身が後から入る領域は、後から作ると読み上げられない
    const live = document.querySelector("[aria-live]");
    expect(live).not.toBeNull();
  });

  it("行動はすべて button で、読み上げ名から掴める", () => {
    startDrill();
    const group = screen.getByRole("group", { name: "行動の選択肢" });
    const buttons = within(group).getAllByRole("button");
    const scenario = findScenario("EQ01")!;
    expect(buttons).toHaveLength(scenario.events[0].actions.length);
    for (const a of scenario.events[0].actions) {
      expect(within(group).getByRole("button", { name: new RegExp(a.label) })).toBeTruthy();
    }
  });

  it("危険度は色だけでなく文字でも出る", () => {
    startDrill();
    const meter = screen.getByRole("meter", { name: /危険度/ });
    expect(meter).toBeTruthy();
    // LOW / MEDIUM / HIGH と和名が文字として在る(色に依存しない)
    expect(document.body.textContent).toMatch(/危険度 (LOW|MEDIUM|HIGH)/);
  });

  it("live 領域に現在の場面が入る", () => {
    startDrill();
    const live = document.querySelector("[aria-live]")!;
    const scenario = findScenario("EQ01")!;
    expect(live.textContent).toContain(scenario.events[0].title);
  });
});

describe("T-101 行動で状態が変わる(F-04 / F-08)", () => {
  it("安全な行動を選ぶと安全度が上がり、解説が出る(初心者)", () => {
    startDrill();
    const scenario = findScenario("EQ01")!;
    const before = scenario.initialState.safety;
    fireEvent.click(screen.getByRole("button", { name: /テーブルの下に身を隠す/ }));

    // 解説(F-13)が即時に出る
    expect(screen.getByText("選んだ行動")).toBeTruthy();
    expect(document.body.textContent).toContain("落下物から頭と体を守る基本行動です");
    // 防災ポイントも出る
    expect(screen.getByText("防災ポイント")).toBeTruthy();

    // 状態パネルの安全度が上がっている
    const shown = safetyShown();
    expect(shown).toBeGreaterThan(before);
  });

  it("危険な行動を選ぶと安全度が下がる", () => {
    startDrill();
    const before = findScenario("EQ01")!.initialState.safety;
    fireEvent.click(screen.getByRole("button", { name: /すぐ外へ飛び出す/ }));
    expect(safetyShown()).toBeLessThan(before);
  });

  it("分岐する行動は別の場面へ進む(§4 目玉)", () => {
    startDrill();
    fireEvent.click(screen.getByRole("button", { name: /すぐ外へ飛び出す/ }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    // run-out は eq-outside へ分岐する
    expect(screen.getByRole("heading", { name: "屋外" })).toBeTruthy();
  });

  it("既定の行動は既定の次の場面へ進む", () => {
    startDrill();
    fireEvent.click(screen.getByRole("button", { name: /テーブルの下に身を隠す/ }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByRole("heading", { name: "揺れが収まった" })).toBeTruthy();
  });
});

describe("T-102 モードの違い(F-11)", () => {
  it("標準モードでは解説をはさまず次の場面へ進む", () => {
    startDrill("標準");
    fireEvent.click(screen.getByRole("button", { name: /テーブルの下に身を隠す/ }));
    // 解説画面を経ずに次の場面が出る
    expect(screen.queryByText("選んだ行動")).toBeNull();
    expect(screen.getByRole("heading", { name: "揺れが収まった" })).toBeTruthy();
  });

  it("標準モードでは残り時間が出る(F-12)", () => {
    startDrill("標準");
    expect(screen.getByRole("timer")).toBeTruthy();
    expect(document.body.textContent).toMatch(/残り \d+ 秒/);
  });

  it("初心者モードでは残り時間が出ない(F-12)", () => {
    startDrill("初心者");
    expect(screen.queryByRole("timer")).toBeNull();
  });
});

describe("T-103 時間切れ(F-12)", () => {
  it("残り時間が 0 になると自動で行動が選ばれ、その旨が出る", () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    try {
      render(<PlayClient />);
      fireEvent.click(screen.getByRole("button", { name: /標準/ }));
      fireEvent.click(screen.getByRole("button", { name: "訓練を始める" }));
      const limit = findScenario("EQ01")!.events[0].timeLimit!;
      // 事前条件: この場面には時間制限が実在する(対照の前提を固定する)
      expect(limit).toBeGreaterThan(0);
      // **タイマー起因の状態更新は act で包む。**包まないと React が反映を流さず、
      // 「時間切れが起きなかった」ように見える(実装ではなくテストの誤り)
      for (let i = 0; i <= limit; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }
      expect(screen.getByRole("alert").textContent).toContain("判断が間に合いませんでした");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("T-104 最後まで進むと結果へ渡る(F-09 / F-10)", () => {
  it("終了時に走行を保存して結果画面へ遷移する", () => {
    startDrill();
    playToEnd();
    expect(push).toHaveBeenCalledWith("/result");
    const h = loadHandoff();
    expect(h).not.toBeNull();
    expect(h!.run.eventId).toBeNull();
    expect(h!.run.history.length).toBeGreaterThan(0);
    expect(window.sessionStorage.getItem(HANDOFF_KEY)).not.toBeNull();
  });
});

describe("T-105 結果画面(F-09 / F-10 / F-17)", () => {
  it("得点・ランク・履歴・比較が出て、成績が保存される", async () => {
    startDrill();
    playToEnd();
    cleanup();

    render(<ResultClient />);
    // useEffect で sessionStorage を読むので、描画後に反映される
    await screen.findByText("良かった判断");
    expect(screen.getByText("行動履歴")).toBeTruthy();
    expect(screen.getByText("もし別の行動をしていたら")).toBeTruthy();
    expect(screen.getByText("防災ポイント")).toBeTruthy();

    // 保存(F-10)
    const store = loadStore(window.localStorage);
    expect(store.clears).toBe(1);
    expect(store.history).toHaveLength(1);
    expect(store.bestByScenario.EQ01).toBeTruthy();
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("記録が無ければその旨を出す(壊れた状態でも落ちない)", async () => {
    render(<ResultClient />);
    await screen.findByText("結果がありません");
  });
});

describe("T-106 未知のシナリオ(元仕様 §46)", () => {
  it("読み込めない旨とトップへの導線を出す", () => {
    query = "scenario=NOPE";
    render(<PlayClient />);
    expect(screen.getByText("シナリオを読み込めませんでした")).toBeTruthy();
    expect(screen.getByRole("link", { name: "シナリオ一覧へ戻る" })).toBeTruthy();
  });
});

/** 状態パネルに出ている安全度の数値を読む */
function safetyShown(): number {
  const items = Array.from(document.querySelectorAll(".stat"));
  const safety = items.find((el) => el.textContent?.includes("安全度"));
  const value = safety?.querySelector(".stat__value")?.textContent ?? "";
  const n = Number(value);
  expect(Number.isFinite(n), `安全度を読めなかった: ${JSON.stringify(value)}`).toBe(true);
  return n;
}

/**
 * 各場面の先頭の行動を押し続けて終端まで進める。
 * **`fireEvent` で押す** —— 生の `element.click()` は act に包まれないので、
 * 状態の反映前に次の問い合わせが走り、進んでいないように見える。
 */
function playToEnd(maxSteps = 30): void {
  for (let i = 0; i < maxSteps; i++) {
    const group = screen.queryByRole("group", { name: "行動の選択肢" });
    if (group) {
      fireEvent.click(within(group).getAllByRole("button")[0]);
      continue;
    }
    const nextBtn =
      screen.queryByRole("button", { name: "次へ" }) ??
      screen.queryByRole("button", { name: "結果を見る" });
    if (nextBtn) {
      fireEvent.click(nextBtn);
      continue;
    }
    return;
  }
  throw new Error(`${maxSteps} 手で終端に達しなかった。遷移が循環している疑いがある`);
}
