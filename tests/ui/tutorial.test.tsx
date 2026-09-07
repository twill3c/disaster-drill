import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Tutorial } from "@/components/Tutorial";
import { defaultStore, loadStore, saveStore, STORAGE_KEY } from "@/lib/storage";

// 出所: SPEC F-22(元仕様 §40)。初回起動時のみ表示し、既読は F-10 の設定に保存する。

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe("T-107 チュートリアル(F-22)", () => {
  it("初回は 5 手順が出る", async () => {
    render(<Tutorial />);
    await screen.findByRole("heading", { name: "はじめての方へ" });
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items[0].textContent).toBe("状況を読む");
    expect(items[4].textContent).toBe("再挑戦する");
  });

  it("閉じると消え、既読が保存される", async () => {
    render(<Tutorial />);
    await screen.findByRole("heading", { name: "はじめての方へ" });
    fireEvent.click(screen.getByRole("button", { name: "分かりました" }));
    expect(screen.queryByRole("heading", { name: "はじめての方へ" })).toBeNull();
    expect(loadStore(window.localStorage).settings.tutorialSeen).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("既読なら二度目は出ない", async () => {
    saveStore(window.localStorage, {
      ...defaultStore(),
      settings: { tutorialSeen: true },
    });
    const { container } = render(<Tutorial />);
    // 出ないことは「まだ描画されていない」と区別が付かないので、
    // 一度描画を待ってから中身が空であることを見る
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toBe("");
    expect(screen.queryByRole("heading", { name: "はじめての方へ" })).toBeNull();
  });

  it("陽性対照: 既読の印を消せば再び出る", async () => {
    saveStore(window.localStorage, {
      ...defaultStore(),
      settings: { tutorialSeen: true },
    });
    // 前提: この状態では出ない(上のケースで確認済み)
    saveStore(window.localStorage, defaultStore());
    render(<Tutorial />);
    await screen.findByRole("heading", { name: "はじめての方へ" });
  });
});
