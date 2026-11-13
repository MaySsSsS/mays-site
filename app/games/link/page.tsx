import type { Metadata } from "next";

import { LinkClient } from "@/components/game/LinkClient";

export const metadata: Metadata = {
  title: "绑定游戏账号",
  description: "绑定 PSN / 任天堂账号，之后由 social-api 定时采集游玩时长。",
  robots: { index: false, follow: false },
};

export default function LinkPage() {
  return <LinkClient />;
}
