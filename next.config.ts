import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 对于 Cloudflare Pages，必须关闭这些功能
  images: {
    unoptimized: true,
  },
  // 关闭 React 严格模式避免双重渲染
  reactStrictMode: false,
  // 跳过 TypeScript 和 ESLint 检查
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
