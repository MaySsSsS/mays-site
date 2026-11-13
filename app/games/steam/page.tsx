import type { Metadata } from "next";

import { GameHome } from "@/components/game/GameHome";
import { getSteamGamesData } from "@/lib/steam-data";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Steam",
  description: "Steam 游戏记录：总时长、最近游玩与最常打开的作品。"
};

export default async function SteamPage() {
  const initialData = await getSteamGamesData();
  return <GameHome initialData={initialData} />;
}