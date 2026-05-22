import type { Metadata } from "next";

import { SignalArenaLogs } from "@/components/signal-arena/SignalArenaLogs";
import { SignalArenaShell } from "@/components/signal-arena/SignalArenaShell";
import { getSignalArenaPublicData } from "@/lib/signal-arena-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signal Arena Logs",
  description: "MAYS UNIVERSE 的 AI Trader Runner 决策日志。"
};

export default async function SignalArenaLogsPage() {
  const data = await getSignalArenaPublicData();

  return (
    <SignalArenaShell active="logs" updatedAt={data.dashboard.updatedAt}>
      <SignalArenaLogs logs={data.logs} />
    </SignalArenaShell>
  );
}
