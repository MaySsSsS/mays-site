import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mays Site",
    template: "%s | Mays Site"
  },
  description: "统一到 Next.js 的个人网站，包含 Steam 游戏仪表盘和照片足迹。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
