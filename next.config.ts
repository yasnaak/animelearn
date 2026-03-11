import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@remotion/bundler',
    '@remotion/renderer',
    '@remotion/compositor-darwin-arm64',
    '@remotion/compositor-darwin-x64',
    '@remotion/compositor-linux-x64-gnu',
    '@remotion/compositor-linux-arm64-gnu',
    '@remotion/compositor-win32-x64-msvc',
  ],
};

export default nextConfig;
