import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LinkClient } from "@/components/game/LinkClient";

export const metadata: Metadata = {
  title: "绑定游戏账号",
  description: "绑定 PSN / 任天堂账号，之后由 social-api 定时采集游玩时长。",
  robots: { index: false, follow: false },
};

export default function LinkPage() {
  // 绑定页只在本地 dev 存在：线上构建直接 404，避免把管理界面暴露在公网。
  // 真正的闸门仍是 Worker 的 ADMIN_TOKEN（写接口都要 Bearer），这里只是不提供入口。
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <LinkClient />;
}
