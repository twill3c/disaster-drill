/**
 * localStorage 保存(F-10 / G-06)。個人情報は保存しない。
 * ストレージは引数で注入する(テストと、localStorage 不可の環境のため)。
 */

import type { Mode, Rank } from "@/core/types";

export const STORAGE_KEY = "disaster-drill-history";
export const HISTORY_LIMIT = 20;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PlayRecord {
  scenarioId: string;
  mode: Mode;
  score: number;
  rank: Rank;
  /** ISO 8601 */
  playedAt: string;
  seed?: string;
}

export interface Settings {
  tutorialSeen: boolean;
}

export interface Store {
  bestScore: number;
  clears: number;
  bestByScenario: Record<string, { score: number; rank: Rank }>;
  history: PlayRecord[];
  settings: Settings;
}

export function defaultStore(): Store {
  return {
    bestScore: 0,
    clears: 0,
    bestByScenario: {},
    history: [],
    settings: { tutorialSeen: false },
  };
}

const RANKS: readonly string[] = ["S", "A", "B", "C", "D"];
const MODES: readonly string[] = ["beginner", "standard", "challenge"];

function isRecord(v: unknown): v is PlayRecord {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.scenarioId === "string" &&
    typeof r.mode === "string" &&
    MODES.includes(r.mode) &&
    typeof r.score === "number" &&
    typeof r.rank === "string" &&
    RANKS.includes(r.rank) &&
    typeof r.playedAt === "string"
  );
}

/** 形が合わなければ全体を初期値に落とす(部分的に信用しない) */
function parseStore(raw: string): Store | null {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.bestScore !== "number" || typeof o.clears !== "number") return null;
  if (!Array.isArray(o.history) || !o.history.every(isRecord)) return null;
  if (typeof o.bestByScenario !== "object" || o.bestByScenario === null) return null;
  const best: Store["bestByScenario"] = {};
  for (const [k, b] of Object.entries(o.bestByScenario as Record<string, unknown>)) {
    if (typeof b !== "object" || b === null) return null;
    const bb = b as Record<string, unknown>;
    if (typeof bb.score !== "number" || typeof bb.rank !== "string" || !RANKS.includes(bb.rank))
      return null;
    best[k] = { score: bb.score, rank: bb.rank as Rank };
  }
  const settings = (typeof o.settings === "object" && o.settings !== null ? o.settings : {}) as Record<
    string,
    unknown
  >;
  return {
    bestScore: o.bestScore,
    clears: o.clears,
    bestByScenario: best,
    history: o.history as PlayRecord[],
    settings: { tutorialSeen: settings.tutorialSeen === true },
  };
}

export function loadStore(storage: StorageLike | null): Store {
  if (!storage) return defaultStore();
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return defaultStore();
  }
  if (raw === null) return defaultStore();
  return parseStore(raw) ?? defaultStore();
}

/** 保存できたら true。localStorage 不可なら false(訓練は続行できる) */
export function saveStore(storage: StorageLike | null, store: Store): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

const RANK_ORDER: Record<Rank, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

export function recordResult(store: Store, rec: PlayRecord): Store {
  const prev = store.bestByScenario[rec.scenarioId];
  const better =
    !prev ||
    rec.score > prev.score ||
    (rec.score === prev.score && RANK_ORDER[rec.rank] < RANK_ORDER[prev.rank]);
  return {
    bestScore: Math.max(store.bestScore, rec.score),
    clears: store.clears + 1,
    bestByScenario: better
      ? { ...store.bestByScenario, [rec.scenarioId]: { score: rec.score, rank: rec.rank } }
      : store.bestByScenario,
    history: [rec, ...store.history].slice(0, HISTORY_LIMIT),
    settings: store.settings,
  };
}

/** ブラウザの localStorage を安全に取る。無ければ null */
export function browserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    // アクセス自体が投げる環境(プライベートモード等)を弾く
    s.getItem(STORAGE_KEY);
    return s;
  } catch {
    return null;
  }
}
