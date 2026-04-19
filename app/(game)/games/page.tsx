import { GameLibrary } from "@/components/game/GameLibrary";
import { getSteamGamesData } from "@/lib/steam-data";

export const revalidate = 3600;

export default async function GamesPage() {
  const initialData = await getSteamGamesData();
  return <GameLibrary initialData={initialData} />;
}
