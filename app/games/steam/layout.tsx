import { SteamShell } from "@/components/game/SteamShell";
import { getSteamGamesData } from "@/lib/steam-data";

export default async function SteamLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialData = await getSteamGamesData();

  return <SteamShell player={initialData.player}>{children}</SteamShell>;
}