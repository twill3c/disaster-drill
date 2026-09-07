import { STAT_KEYS, dangerLevel } from "@/core/simulation";
import type { SimulationState, StatKey } from "@/core/types";

export const STAT_LABEL: Record<StatKey, string> = {
  safety: "安全度",
  health: "健康",
  supplies: "物資",
  information: "情報",
  evacuation: "避難達成度",
  familySafety: "家族の安否",
};

const DANGER_JA = { LOW: "低い", MEDIUM: "中くらい", HIGH: "高い" } as const;

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 帯の色。**この色が対応する述語は「その指標は高いほど得点が上がる」**である(HC-079)。
 * F-05 の重みは六指標すべてが正なので、値が低いことは実際に得点を下げている。
 * 良し悪しの印象だけを与える色ではない。
 *
 * ただし色は補助でしかない —— 数値を必ず併記し、色が読めなくても伝わるようにする(N-05)。
 */
function fillClass(v: number): string {
  if (v >= 67) return "stat__fill stat__fill--ok";
  if (v >= 34) return "stat__fill stat__fill--warn";
  return "stat__fill stat__fill--danger";
}

/**
 * 危険度(F-15)。**色だけに依存させない** —— LOW / MEDIUM / HIGH の語と
 * 和名を必ず文字で出す(N-05)。
 */
export function DangerMeter({ safety }: { safety: number }) {
  const level = dangerLevel(safety);
  const danger = 100 - safety;
  return (
    <div className={`danger danger--${level}`}>
      <span className="danger__label">
        危険度 {level}({DANGER_JA[level]})
      </span>
      <span
        className="danger__meter"
        role="meter"
        aria-valuenow={danger}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`危険度 ${danger} / 100`}
      >
        <span className="danger__fill" style={{ width: `${danger}%` }} />
      </span>
    </div>
  );
}

export function StatusPanel({ state }: { state: SimulationState }) {
  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.6rem" }}>
        <DangerMeter safety={state.safety} />
      </div>
      <ul className="stats">
        {STAT_KEYS.map((k) => (
          <li key={k} className="stat">
            <span className="stat__row">
              <span className="stat__name">{STAT_LABEL[k]}</span>
              <span className="stat__value">{Math.round(state[k])}</span>
            </span>
            <span className="stat__bar">
              <span className={fillClass(state[k])} style={{ width: `${state[k]}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
