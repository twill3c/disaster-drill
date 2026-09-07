import type { DisasterType } from "@/core/types";

/**
 * 災害ごとの簡易 2D シーン(F-14 / 元仕様 §17・§18)。
 * 外部画像・外部ライブラリを使わず SVG と CSS アニメーションだけで描く。
 * 動きは `prefers-reduced-motion` で止まる(globals.css)。
 *
 * `intensity` は 0〜1。危険度が上がるほど激しく見せる。
 */
export function DisasterScene({
  type,
  intensity = 0.5,
}: {
  type: DisasterType;
  intensity?: number;
}) {
  const t = Math.max(0, Math.min(1, intensity));
  return (
    <svg
      className="scene"
      viewBox="0 0 320 120"
      role="img"
      aria-label={SCENE_LABEL[type]}
      preserveAspectRatio="xMidYMid meet"
    >
      {SCENES[type](t)}
    </svg>
  );
}

const SCENE_LABEL: Record<DisasterType, string> = {
  earthquake: "揺れる家と落下する物を描いた図",
  fire: "煙の広がる建物と避難経路を描いた図",
  flood: "降り続く雨と上昇する水位を描いた図",
  tsunami: "沖から迫る波と高台を描いた図",
  landslide: "崩れかけた斜面と家を描いた図",
};

const GROUND = "#243449";

function House({ shake }: { shake?: boolean }) {
  return (
    <g className={shake ? "anim-shake" : undefined}>
      <rect x="118" y="58" width="84" height="42" fill="#2f4059" />
      <path d="M112 58 L160 30 L208 58 Z" fill="#3d5878" />
      <rect x="134" y="72" width="20" height="18" fill="#0b1017" />
      <rect x="168" y="70" width="20" height="14" fill="#8fb8e8" opacity="0.65" />
    </g>
  );
}

const SCENES: Record<DisasterType, (t: number) => React.ReactNode> = {
  earthquake: (t) => (
    <>
      <rect x="0" y="100" width="320" height="20" fill={GROUND} />
      <House shake />
      {/* 落下物 */}
      <g className="anim-shake">
        {[40, 74, 240, 274].map((x, i) => (
          <rect
            key={x}
            x={x}
            y={68 + i * 6}
            width="10"
            height="10"
            fill="#54677f"
            opacity={0.5 + t * 0.4}
          />
        ))}
      </g>
      {/* 揺れの記号 */}
      <g stroke="#f5b942" strokeWidth="2" fill="none" opacity={0.35 + t * 0.5}>
        <path d="M20 46 q8 -10 16 0 q8 10 16 0" />
        <path d="M268 46 q8 -10 16 0 q8 10 16 0" />
      </g>
    </>
  ),
  fire: (t) => (
    <>
      <rect x="0" y="100" width="320" height="20" fill={GROUND} />
      <House />
      {/* 炎 */}
      <g className="anim-flicker">
        <path
          d="M132 92 q6 -18 14 -24 q-2 12 6 16 q6 -8 4 -18 q12 12 10 26 z"
          fill="#ff7a3d"
          opacity={0.7 + t * 0.3}
        />
      </g>
      {/* 煙 */}
      <g fill="#8595ab" opacity={0.25 + t * 0.35} className="anim-rise">
        <ellipse cx="160" cy="26" rx="34" ry="12" />
        <ellipse cx="196" cy="18" rx="22" ry="9" />
        <ellipse cx="126" cy="16" rx="18" ry="8" />
      </g>
      {/* 避難経路 */}
      <g stroke="#3ec98a" strokeWidth="2.5" fill="none" strokeDasharray="6 4">
        <path d="M206 96 L272 96" />
      </g>
      <path d="M272 90 L284 96 L272 102 Z" fill="#3ec98a" />
    </>
  ),
  flood: (t) => (
    <>
      <rect x="0" y="100" width="320" height="20" fill={GROUND} />
      <House />
      {/* 雨 */}
      <g stroke="#7fb2e8" strokeWidth="2" opacity="0.6" className="anim-rain">
        {[24, 58, 92, 210, 244, 278, 304].map((x) => (
          <line key={x} x1={x} y1="4" x2={x - 4} y2="22" />
        ))}
      </g>
      {/* 水位 */}
      <g className="anim-rise">
        <rect x="0" y={100 - t * 34} width="320" height={20 + t * 34} fill="#2a6ea8" opacity="0.75" />
        <path
          d={`M0 ${100 - t * 34} q20 -5 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0`}
          stroke="#6fb2e0"
          strokeWidth="2"
          fill="none"
        />
      </g>
    </>
  ),
  tsunami: (t) => (
    <>
      <rect x="0" y="100" width="320" height="20" fill={GROUND} />
      {/* 高台 */}
      <path d="M236 100 L280 44 L320 100 Z" fill="#3a5136" />
      <rect x="270" y="60" width="16" height="14" fill="#2f4059" />
      {/* 家 */}
      <g transform="translate(-56 8) scale(0.72)">
        <House />
      </g>
      {/* 波 */}
      <g className="anim-rise">
        <path
          d={`M0 ${96 - t * 26} q26 -${30 + t * 26} 56 -10 q18 12 26 ${-8 - t * 10} q14 16 22 ${-4} L104 100 L0 100 Z`}
          fill="#2a6ea8"
        />
        <path
          d={`M0 ${96 - t * 26} q26 -${30 + t * 26} 56 -10`}
          stroke="#bfe0ff"
          strokeWidth="3"
          fill="none"
        />
      </g>
      {/* 避難方向 */}
      <g stroke="#3ec98a" strokeWidth="2.5" fill="none" strokeDasharray="6 4">
        <path d="M150 92 L226 78" />
      </g>
      <path d="M226 72 L240 76 L228 84 Z" fill="#3ec98a" />
    </>
  ),
  landslide: (t) => (
    <>
      <rect x="0" y="100" width="320" height="20" fill={GROUND} />
      {/* 斜面 */}
      <path d="M0 100 L0 20 L150 100 Z" fill="#3a5136" />
      {/* 崩れる土砂 */}
      <g className="anim-slide">
        <path
          d={`M24 44 L${86 + t * 20} 100 L${34 + t * 14} 100 Z`}
          fill="#7a5a3a"
          opacity={0.6 + t * 0.4}
        />
        {[[52, 62], [70, 78], [40, 54]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="#a07c52" />
        ))}
      </g>
      {/* 家 */}
      <g transform="translate(28 8) scale(0.8)">
        <House />
      </g>
      {/* 雨 */}
      <g stroke="#7fb2e8" strokeWidth="2" opacity="0.5" className="anim-rain">
        {[200, 232, 264, 296].map((x) => (
          <line key={x} x1={x} y1="4" x2={x - 4} y2="22" />
        ))}
      </g>
    </>
  ),
};
