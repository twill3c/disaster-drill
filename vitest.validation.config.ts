import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * 出荷物(`out/`)に対する検査。**`next build` の後にしか走らせられない**ので、
 * 単体テストとは別の設定に分けてある(TEST_SPEC の実行規約)。
 * カバレッジの閾値は掛けない —— ここで測るのは実装の被覆ではなく、配られる木の中身である。
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/validation/*.test.ts"],
  },
});
