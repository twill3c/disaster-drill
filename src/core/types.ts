/**
 * 型定義(SPEC F-01〜F-04)。値を輸出しないので vitest のカバレッジ分母から外してある。
 */

export type DisasterType =
  | "earthquake"
  | "fire"
  | "flood"
  | "tsunami"
  | "landslide";

export type RiskLevel = "low" | "medium" | "high";

/** 0〜100 にクランプされる指標(F-01)。`time` と `score` は含まない */
export type StatKey =
  | "safety"
  | "health"
  | "supplies"
  | "information"
  | "evacuation"
  | "familySafety";

export interface SimulationState {
  /** 経過秒。単調非減少 */
  time: number;
  safety: number;
  health: number;
  supplies: number;
  information: number;
  evacuation: number;
  familySafety: number;
  /** F-05 で毎回計算し直す派生値 */
  score: number;
}

export type Effects = Partial<Record<StatKey | "time", number>>;

export interface Action {
  id: string;
  label: string;
  description: string;
  effects: Effects;
  /** 結果画面・Beginner の即時解説に使う */
  explanation: string;
  riskLevel: RiskLevel;
  /** 分岐先。省略時は ScenarioEvent.nextEvent */
  next?: string;
}

export interface InfoCard {
  title: string;
  body: string;
  /** 情報を得たことによる効果(元仕様 §20 の information +10 など) */
  effects?: Effects;
}

/** Challenge のランダムイベント(F-18)。イベントに入った瞬間に一つ選ばれる */
export interface EventVariant {
  id: string;
  /** 本文に追記される一文 */
  description: string;
  effects?: Effects;
}

export interface ScenarioEvent {
  id: string;
  title: string;
  description: string;
  actions: Action[];
  nextEvent?: string;
  /** 秒。F-12 のタイムリミット */
  timeLimit?: number;
  /** 時間切れで適用する行動 ID。省略時は riskLevel が最も高い行動 */
  timeoutActionId?: string;
  info?: InfoCard;
  /** 防災ポイント(F-13) */
  tip?: string;
  variants?: EventVariant[];
}

export interface Scenario {
  id: string;
  title: string;
  disasterType: DisasterType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  introduction: string;
  initialState: SimulationState;
  /** 秒。F-05 の timeScore の分母 */
  timeBudget: number;
  /** 先頭が開始イベント */
  events: ScenarioEvent[];
}

export interface HistoryEntry {
  eventId: string;
  actionId: string;
  /** 行動前の状態。F-09 の「別の行動をしていたら」に使う */
  before: SimulationState;
  /** 行動後の経過秒 */
  at: number;
  /** 時間切れで自動適用されたか(F-12) */
  timedOut?: boolean;
  /** 適用されたランダムイベント(F-18) */
  variantId?: string;
}

export interface Run {
  scenarioId: string;
  state: SimulationState;
  /** null は終了 */
  eventId: string | null;
  history: HistoryEntry[];
  /** enterEvent で選ばれ、次の applyAction で history に移る(F-18) */
  pendingVariantId?: string;
}

export type Rank = "S" | "A" | "B" | "C" | "D";

export type DangerLevel = "LOW" | "MEDIUM" | "HIGH";

export type Mode = "beginner" | "standard" | "challenge";
