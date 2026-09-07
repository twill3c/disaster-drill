import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    // tsconfig の paths("@/*" → "./src/*")を vitest にも適用する
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/*.test.ts", "tests/ui/*.test.tsx"],
    environment: "node",
    environmentMatchGlobs: [["tests/ui/**", "jsdom"]],
    globals: false,
    coverage: {
      provider: "v8",
      include: ["src/core/**/*.ts", "src/lib/**/*.ts"],
      // 型だけのモジュールは実行時に消えるので include に残すと 0% と数えられる。
      // ここに足してよいのは値を一つも輸出しないファイルだけ。
      exclude: ["src/core/types.ts"],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 },
    },
  },
});
