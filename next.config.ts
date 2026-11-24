import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // /favicon.ico へのリクエストもアイコン（app/icon.svg）へ寄せる（404を出さない）
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/icon.svg' }];
  },
};

export default nextConfig;
