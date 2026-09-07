import type { Metadata, Viewport } from "next";

import { COPYRIGHT, FOOTER_ITEMS } from "@/lib/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "防災訓練シミュレーター — Disaster Drill",
  description:
    "災害発生時の状況をブラウザ上で疑似体験する訓練シミュレーター。選んだ行動で状況が変わり、結果を評価して何度でも挑戦できます。地震・火災・洪水・津波・土砂災害の5シナリオ。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        {children}

        {/* fleet: fixed footer。共通規約の 5 項目・この並び・下部固定 */}
        <footer className="site-footer">
          <div className="site-footer__inner">
            <a href={FOOTER_ITEMS[0].href}>{FOOTER_ITEMS[0].label}</a>
            <span className="site-footer__copy">{COPYRIGHT}</span>
            {FOOTER_ITEMS.slice(1).map((i) => (
              <span key={i.label} className="site-footer__item">
                <span className="fsep">・</span>
                <a href={i.href}>{i.label}</a>
              </span>
            ))}
          </div>
        </footer>
      </body>
    </html>
  );
}
