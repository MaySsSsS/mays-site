import { PlayStationShell } from "@/components/game/PlayStationShell";

export default function PlayStationLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PlayStationShell>{children}</PlayStationShell>;
}
