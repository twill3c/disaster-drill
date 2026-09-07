import Link from "next/link";

import { Disclaimer } from "@/components/Disclaimer";
import { Tutorial } from "@/components/Tutorial";

/** トップ画面(元仕様 §39)。 */
export default function Home() {
  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <p className="topbar__title">防災訓練シミュレーター</p>
          <span className="topbar__meta">DISASTER DRILL</span>
        </div>
      </header>

      <main>
        <h1>災害が起きたとき、あなたはどう判断しますか?</h1>
        <p>
          このアプリは防災知識を読むものではありません。災害が起きた場面に置かれ、
          限られた時間と情報のなかで行動を選び、その結果を見て、なぜそうなったのかを知り、
          もう一度挑戦するための訓練です。
        </p>

        <Tutorial />

        <div className="stack">
          <Link className="btn btn--primary" href="/scenarios">
            訓練を開始する
          </Link>
          <Link className="btn" href="/scenarios">
            <span className="btn__label">シナリオ一覧</span>
            <span className="btn__desc">地震・火災・洪水・津波・土砂災害の5種類</span>
          </Link>
          <Link className="btn" href="/records">
            <span className="btn__label">成績を見る</span>
            <span className="btn__desc">自己ベストとプレイ履歴</span>
          </Link>
        </div>

        <h2>進め方</h2>
        <ol className="small">
          <li>状況を読む</li>
          <li>行動を選ぶ</li>
          <li>結果を見る</li>
          <li>評価を確認する</li>
          <li>再挑戦する</li>
        </ol>
        <p className="small muted">
          正解を選ぶクイズではありません。同じ行動でも、揺れている最中と収まった後とでは
          結果が変わります。
        </p>

        <Disclaimer />
      </main>
    </>
  );
}
