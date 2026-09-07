import { Suspense } from "react";

import { Disclaimer } from "@/components/Disclaimer";
import { ResultClient } from "@/components/ResultClient";

export const metadata = { title: "結果 — 防災訓練シミュレーター" };

/**
 * 結果画面(F-09)。
 *
 * **免責(F-17)はここに置く。** 結果の中身はクライアント状態に依存するので、
 * `ResultClient` の内側に置くと事前描画された HTML に入らない ——
 * 静的エクスポートの `out/result.html` を実測して分かった(loop_001)。
 * 免責は結果の有無に関係なく出るべきものなので、サーバ側の外枠に置くのが正しい。
 */
export default function Result() {
  return (
    <>
      <Suspense
        fallback={
          <main>
            <p className="muted">読み込んでいます…</p>
          </main>
        }
      >
        <ResultClient />
      </Suspense>
      <div style={{ maxWidth: "34rem", margin: "0 auto", padding: "0 1rem 2rem" }}>
        <Disclaimer />
      </div>
    </>
  );
}
