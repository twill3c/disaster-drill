"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createRng, seedFromString } from "@/core/random";
import {
  applyAction,
  createRun,
  dangerLevel,
  enterEvent,
  findEvent,
  timeoutAction,
} from "@/core/simulation";
import type { Action, EventVariant, Mode, Run, Scenario } from "@/core/types";
import { DisasterScene } from "@/components/DisasterScene";
import { StatusPanel, formatTime } from "@/components/StatusPanel";
import { SCENARIOS, findScenario } from "@/data";
import { saveHandoff } from "@/lib/handoff";

const MODE_LABEL: Record<Mode, string> = {
  beginner: "初心者",
  standard: "標準",
  challenge: "挑戦",
};

const MODE_DESC: Record<Mode, string> = {
  beginner: "時間制限なし。行動ごとに解説が出ます。",
  standard: "時間制限あり。解説は結果画面でまとめて出ます。",
  challenge: "時間制限あり。ランダムな出来事が加わります。",
};

/** 危険度から場面の激しさへ。安全度が低いほど 1 に近づく */
function intensityOf(safety: number): number {
  return Math.max(0.15, Math.min(1, (100 - safety) / 100));
}

export function PlayClient() {
  const params = useSearchParams();
  const router = useRouter();
  const scenarioId = params.get("scenario") ?? SCENARIOS[0].id;
  const scenario = findScenario(scenarioId);

  if (!scenario) {
    return (
      <main>
        <h1>シナリオを読み込めませんでした</h1>
        <p className="small muted">指定された訓練シナリオが見つかりません。</p>
        <Link className="btn btn--primary" href="/scenarios">
          シナリオ一覧へ戻る
        </Link>
      </main>
    );
  }
  return <Drill scenario={scenario} router={router} />;
}

type Router = ReturnType<typeof useRouter>;

function Drill({ scenario, router }: { scenario: Scenario; router: Router }) {
  const [mode, setMode] = useState<Mode>("beginner");
  const [seedText, setSeedText] = useState("");
  const [started, setStarted] = useState(false);
  const [run, setRun] = useState<Run>(() => createRun(scenario));
  const [variant, setVariant] = useState<EventVariant | null>(null);
  const [lastAction, setLastAction] = useState<Action | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const rngRef = useRef(createRng(0));

  const event = findEvent(scenario, run.eventId);
  const timed = mode !== "beginner" && event?.timeLimit !== undefined;

  // 行動の適用。時間切れからも呼ぶので useCallback で固定する。
  //
  // **解説をはさむのは初心者モードと時間切れのときだけ**(F-11 / F-13)。
  // 標準・挑戦で毎回はさむと、間の画面を経由しないと終了に進めなくなる
  // (`lastAction` が立っている間は結果画面への遷移が止まるため)。
  const choose = useCallback(
    (action: Action, timedOut = false) => {
      setRun((prev) => applyAction(prev, scenario, action, timedOut));
      if (mode === "beginner" || timedOut) setLastAction(action);
      setRemaining(null);
    },
    [scenario, mode],
  );

  // イベントに入るたび: variant の抽選(F-18)と残り時間の初期化(F-12)
  useEffect(() => {
    if (!started || !run.eventId || lastAction) return;
    const ev = findEvent(scenario, run.eventId);
    if (!ev) return;
    const { run: entered, variant: v } = enterEvent(run, scenario, mode, rngRef.current);
    setVariant(v);
    if (v) setRun(entered);
    setRemaining(mode !== "beginner" && ev.timeLimit !== undefined ? ev.timeLimit : null);
    // run.eventId が変わったときだけ走らせる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.eventId, started, lastAction]);

  // カウントダウン(F-12)
  useEffect(() => {
    if (remaining === null || lastAction || !started) return;
    if (remaining <= 0) {
      const ev = findEvent(scenario, run.eventId);
      if (ev) choose(timeoutAction(ev), true);
      return;
    }
    const id = window.setTimeout(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [remaining, lastAction, started, run.eventId, scenario, choose]);

  // 終了したら結果画面へ
  useEffect(() => {
    if (!started || run.eventId !== null || lastAction) return;
    saveHandoff({
      run,
      mode,
      seed: seedText || "auto",
      finishedAt: new Date().toISOString(),
    });
    router.push("/result");
  }, [run, started, lastAction, mode, seedText, router]);

  const start = () => {
    const seed = seedText.trim() === "" ? Date.now() % 1000000 : seedFromString(seedText.trim());
    if (seedText.trim() === "") setSeedText(String(seed));
    rngRef.current = createRng(seed);
    setRun(createRun(scenario));
    setLastAction(null);
    setVariant(null);
    setStarted(true);
  };

  const next = () => {
    setLastAction(null);
  };

  const progress = useMemo(() => {
    const total = scenario.events.length;
    return Math.min(run.history.length + 1, total);
  }, [run.history.length, scenario.events.length]);

  // ------------------------------------------------------------ 開始前
  if (!started) {
    return (
      <>
        <Topbar scenario={scenario} />
        <main>
          <DisasterScene type={scenario.disasterType} intensity={0.45} />
          <h1>{scenario.title}</h1>
          <p>{scenario.introduction}</p>

          <h2>訓練モード</h2>
          <div className="stack">
            {(["beginner", "standard", "challenge"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className="btn"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                style={mode === m ? { borderColor: "var(--accent)" } : undefined}
              >
                <span className="btn__label">
                  {MODE_LABEL[m]}
                  {mode === m ? " ✓" : ""}
                </span>
                <span className="btn__desc">{MODE_DESC[m]}</span>
              </button>
            ))}
          </div>

          <p className="small muted" style={{ marginTop: "1rem" }}>
            <label htmlFor="seed">
              シード(同じ値を入れると挑戦モードの出来事が同じ順で出ます。空欄で自動)
            </label>
            <br />
            <input
              id="seed"
              type="text"
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              placeholder="自動"
              style={{
                marginTop: "0.3rem",
                padding: "0.4rem 0.6rem",
                background: "var(--panel-2)",
                color: "var(--fg)",
                border: "1px solid var(--line)",
                borderRadius: "0.35rem",
                font: "inherit",
                width: "12rem",
              }}
            />
          </p>

          <button type="button" className="btn btn--primary" onClick={start}>
            訓練を始める
          </button>
        </main>
      </>
    );
  }

  // ------------------------------------------------------------ 解説の表示
  if (lastAction) {
    const ev = run.history.length
      ? findEvent(scenario, run.history[run.history.length - 1].eventId)
      : undefined;
    const timedOut = run.history[run.history.length - 1]?.timedOut;
    return (
      <>
        <Topbar
          scenario={scenario}
          run={run}
          progress={progress}
          announce={`「${lastAction.label}」を選びました。${
            mode === "beginner" ? lastAction.explanation : ""
          }`}
        />
        <main>
          {timedOut && (
            <div className="notice" role="alert">
              <strong>判断が間に合いませんでした。</strong>
              <p className="small" style={{ margin: "0.3rem 0 0" }}>
                時間切れのため「{lastAction.label}」が自動で選ばれました。
              </p>
            </div>
          )}
          <div className="panel">
            <h2>選んだ行動</h2>
            <p style={{ margin: 0 }}>
              <strong>{lastAction.label}</strong>
            </p>
            {/* 解説は初心者モードだけ即時に出す。標準・挑戦は結果画面でまとめる(F-11) */}
            {mode === "beginner" && (
              <p className="small" style={{ margin: "0.5rem 0 0" }}>
                {lastAction.explanation}
              </p>
            )}
          </div>

          {mode === "beginner" && ev?.tip && (
            <div className="notice notice--tip">
              <strong>防災ポイント</strong>
              <p className="small" style={{ margin: "0.3rem 0 0" }}>
                {ev.tip}
              </p>
            </div>
          )}

          <StatusPanel state={run.state} />

          <button type="button" className="btn btn--primary" onClick={next}>
            {run.eventId === null ? "結果を見る" : "次へ"}
          </button>
        </main>
      </>
    );
  }

  // ------------------------------------------------------------ 状況の提示
  if (!event) {
    return (
      <main>
        <p className="muted">結果を集計しています…</p>
      </main>
    );
  }

  const level = dangerLevel(run.state.safety);

  return (
    <>
      <Topbar
        scenario={scenario}
        run={run}
        progress={progress}
        announce={`${event.title}。${event.description} 危険度は ${level}。あなたはどうしますか。`}
      />
      <main>
        <DisasterScene
          type={scenario.disasterType}
          intensity={intensityOf(run.state.safety)}
        />

        <div className="panel" aria-live="polite">
          <h1 style={{ fontSize: "1.15rem" }}>{event.title}</h1>
          <p style={{ marginBottom: variant ? "0.5rem" : 0 }}>{event.description}</p>
          {variant && (
            <p className="small" style={{ margin: 0, color: "var(--warn)" }}>
              {variant.description}
            </p>
          )}
        </div>

        {event.info && (
          <div className="notice notice--info">
            <strong>{event.info.title}</strong>
            <p className="small" style={{ margin: "0.3rem 0 0" }}>
              {event.info.body}
            </p>
          </div>
        )}

        {timed && remaining !== null && (
          <div
            className={`timer ${remaining <= 5 ? "timer--urgent" : ""}`}
            style={{ marginBottom: "0.8rem" }}
            role="timer"
            aria-live="off"
          >
            <span className="small">残り {remaining} 秒</span>
            <span className="timer__bar">
              <span
                className="timer__fill"
                style={{
                  width: `${(remaining / (event.timeLimit ?? 1)) * 100}%`,
                }}
              />
            </span>
          </div>
        )}

        <StatusPanel state={run.state} />

        <h2>あなたはどうしますか?</h2>
        <div role="group" aria-label="行動の選択肢">
          {event.actions.map((a) => (
            <button key={a.id} type="button" className="btn" onClick={() => choose(a)}>
              <span className="btn__label">{a.label}</span>
              <span className="btn__desc">{a.description}</span>
            </button>
          ))}
        </div>

        <p className="small muted">
          現在の危険度は {level} です。経過時間 {formatTime(run.state.time)}。
        </p>
      </main>
    </>
  );
}

/**
 * 訓練画面の見出し。
 *
 * **読み上げ用の状況通知(N-05)はここに常設する。** 状況パネルの側に付けると、
 * 訓練開始前の画面には live 領域が存在せず、事前描画された `out/play.html` にも
 * 入らない —— 実測でそうなっていた(loop_001)。live 領域は「後から中身が変わる器」
 * なので、器のほうを最初から置くのが正しい。
 */
function Topbar({
  scenario,
  run,
  progress,
  announce,
}: {
  scenario: Scenario;
  run?: Run;
  progress?: number;
  announce?: string;
}) {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <p className="topbar__title">
          <Link href="/scenarios" style={{ color: "inherit", textDecoration: "none" }}>
            {scenario.title}
          </Link>
        </p>
        {run && (
          <span className="topbar__meta">
            経過 {formatTime(run.state.time)} ・ 場面 {progress} / {scenario.events.length}
          </span>
        )}
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {announce ?? ""}
      </p>
    </header>
  );
}
