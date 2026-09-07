/**
 * 訓練画面 → 結果画面の受け渡し。静的エクスポート(N-02)なのでサーバは無く、
 * `sessionStorage` を経由する。**localStorage(F-10)とは別物**である ——
 * こちらは一回分の走行で、タブを閉じれば消える。
 */

import type { Mode, Run } from "@/core/types";

export const HANDOFF_KEY = "disaster-drill-last-run";

export interface Handoff {
  run: Run;
  mode: Mode;
  seed: string;
  finishedAt: string;
}

export function saveHandoff(h: Handoff): boolean {
  try {
    if (typeof window === "undefined") return false;
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(h));
    return true;
  } catch {
    return false;
  }
}

export function loadHandoff(): Handoff | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as unknown;
    if (typeof v !== "object" || v === null) return null;
    const h = v as Handoff;
    if (!h.run || typeof h.run.scenarioId !== "string" || !Array.isArray(h.run.history)) {
      return null;
    }
    return h;
  } catch {
    return null;
  }
}
