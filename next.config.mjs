/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
