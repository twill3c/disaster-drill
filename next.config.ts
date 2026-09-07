import type { NextConfig } from "next";

// 静的エクスポート(N-02)— バックエンド・API を持たず、out/ のみで動作する
const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
