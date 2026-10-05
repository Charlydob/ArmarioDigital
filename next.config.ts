import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: { root: process.cwd() },
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
  webpack(config) {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
