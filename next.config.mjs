/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // dev 与 build 各用独立产物目录：本地预览常驻 `next dev`，而 `next build` 会清空 `.next`，
  // 两者共用会导致 dev 服务报 MODULE_NOT_FOUND。
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.steamstatic.com"
      },
      {
        protocol: "https",
        hostname: "steamcdn-a.akamaihd.net"
      },
      {
        protocol: "https",
        hostname: "cdn.cloudflare.steamstatic.com"
      }
    ],
    unoptimized: true
  }
};

export default nextConfig;
