import type { Metadata } from "next";

import { NintendoHome } from "@/components/game/NintendoHome";

export const metadata: Metadata = {
  title: "Nintendo Switch",
  description: "Nintendo Switch 2 主界面复刻：方形游戏图标与底部系统图标栏。"
};

export default function NintendoSwitchPage() {
  return <NintendoHome />;
}
