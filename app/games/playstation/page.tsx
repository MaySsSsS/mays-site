import type { Metadata } from "next";

import { PlayStationHome } from "@/components/game/PlayStationHome";

export const metadata: Metadata = {
  title: "PlayStation 5",
  description: "PS5 主界面风格的演示媒体栏：背景随选中的游戏联动，进度与容量为演示数据。"
};

export default function PlayStationPage() {
  return <PlayStationHome />;
}
