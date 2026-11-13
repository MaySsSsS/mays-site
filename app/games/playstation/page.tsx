import type { Metadata } from "next";

import { PlayStationHome } from "@/components/game/PlayStationHome";

export const metadata: Metadata = {
  title: "PlayStation 5",
  description: "PlayStation 5 主界面复刻：背景随选中的游戏切换，底部为游戏图标栏。"
};

export default function PlayStationPage() {
  return <PlayStationHome />;
}
