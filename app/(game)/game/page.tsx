import { GameHome } from "@/components/game/GameHome";
import { getSteamGamesData } from "@/lib/steam-data";

export const revalidate = 3600;

export default async function GamePage() {
  const initialData = await getSteamGamesData();
  return <GameHome initialData={initialData} />;
}
