import type { Metadata } from "next";

import { SteamProfile } from "@/components/game/SteamProfile";
import { getSteamGamesData } from "@/lib/steam-data";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Steam",
  description: "Steam 个人资料页：等级、总时长、最近游玩与游戏收藏家展示。"
};

export default async function SteamPage() {
  const initialData = await getSteamGamesData();
  return <SteamProfile initialData={initialData} />;
}