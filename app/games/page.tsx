import type { Metadata } from "next";

import { PlatformPortal } from "@/components/game/PlatformPortal";

export const metadata: Metadata = {
  title: "游戏",
  description: "Steam、Nintendo Switch、PlayStation 三个平台的游戏记录入口。"
};

export default function GamesPortalPage() {
  return <PlatformPortal />;
}