import type { Metadata } from "next";

import { NintendoHome } from "@/components/game/NintendoHome";

export const metadata: Metadata = {
  title: "Nintendo Switch",
  description: "Switch 2 主界面风格的演示游戏墙：拖动浏览、空槽位与选中详情。"
};

export default function NintendoSwitchPage() {
  return <NintendoHome />;
}
