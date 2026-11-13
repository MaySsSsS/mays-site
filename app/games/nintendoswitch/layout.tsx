import { NintendoShell } from "@/components/game/NintendoShell";

export default function NintendoSwitchLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <NintendoShell>{children}</NintendoShell>;
}
