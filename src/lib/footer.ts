/**
 * フリート共通のフッタ規約(F-21)。
 *
 * ```
 * MIT License © 2026 坂田哲朗 ・ GitHub ・ 防災訓練の受け方 ・ 防災訓練 設計図 ・ App Menu
 * ```
 *
 * 規約で決まっているのは**並びと項目数**であって、3・4 番目の文言は
 * 各アプリの和名と固有の動詞を温存してよい。
 *
 * - 区切りの「・」は**文字として置く**。CSS の `::before` で描くと `innerText` に出ず、
 *   検品器から見えなくなる
 * - `© 2026 坂田哲朗` は MIT License の直後・GitHub の前に、**リンク文言の外**の地の文として置く
 */
export const REPO = "https://github.com/twill3c/disaster-drill";

export interface FooterItem {
  readonly label: string;
  readonly href: string;
}

export const FOOTER_ITEMS: readonly FooterItem[] = [
  { label: "MIT License", href: `${REPO}/blob/main/LICENSE` },
  { label: "GitHub", href: REPO },
  {
    label: "防災訓練の受け方",
    href: "https://claude.ai/code/artifact/de1b25bd-e554-49b1-9bbe-cc8b519239b6",
  },
  {
    label: "防災訓練 設計図",
    href: "https://claude.ai/code/artifact/91e2c660-4f72-4c6b-beda-8e3a91d6661d",
  },
  { label: "App Menu", href: "https://app-menu-amber.vercel.app" },
];

export const COPYRIGHT = "© 2026 坂田哲朗";
