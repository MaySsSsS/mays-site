import type { Metadata } from "next";

import { GameLibrary } from "@/components/game/GameLibrary";
import { getSteamGamesData } from "@/lib/steam-data";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Steam 游戏库",
  description: "Steam 游戏库全量列表，支持搜索与排序。"
};

export default async function SteamLibraryPage() {
  const initialData = await getSteamGamesData();
  return <GameLibrary initialData={initialData} />;
}