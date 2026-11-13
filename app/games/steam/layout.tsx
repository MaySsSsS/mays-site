import { GameShell } from "@/components/game/GameShell";

export default function SteamLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <GameShell>{children}</GameShell>;
}