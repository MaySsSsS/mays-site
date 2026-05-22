import type { Metadata } from "next";

import { SignalArenaDashboard } from "@/components/signal-arena/SignalArenaDashboard";
import { SignalArenaShell } from "@/components/signal-arena/SignalArenaShell";
import { getSignalArenaPublicData } from "@/lib/signal-arena-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signal Arena",
  description: "MAYS UNIVERSE 的 AI 模拟炒股公开总览。"
};

export default async function SignalArenaPage() {
  const data = await getSignalArenaPublicData();

  return (
    <SignalArenaShell active="dashboard" updatedAt={data.dashboard.updatedAt}>
      <SignalArenaDashboard dashboard={data.dashboard} />
    </SignalArenaShell>
  );
}
