import { Suspense } from "react";

import { PlayClient } from "@/components/PlayClient";

export const metadata = { title: "訓練 — 防災訓練シミュレーター" };

/**
 * 訓練画面(F-08)。クエリでシナリオを受け取るので、静的エクスポートでは
 * `useSearchParams` を Suspense で包む必要がある。
 */
export default function Play() {
  return (
    <Suspense
      fallback={
        <main>
          <p className="muted">読み込んでいます…</p>
        </main>
      }
    >
      <PlayClient />
    </Suspense>
  );
}
