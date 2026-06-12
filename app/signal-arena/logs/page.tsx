import type { Metadata } from "next";

import { SignalArenaLogs } from "@/components/signal-arena/SignalArenaLogs";
import { SignalArenaShell } from "@/components/signal-arena/SignalArenaShell";
import { getSignalArenaPublicData } from "@/lib/signal-arena-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quant Lab Logs",
  description: "MAYS UNIVERSE 的 Q-Alpha v1 策略日志。"
};

export default async function SignalArenaLogsPage() {
  const data = await getSignalArenaPublicData();

  return (
    <SignalArenaShell active="logs" updatedAt={data.dashboard.updatedAt}>
      <SignalArenaLogs logs={data.logs} />
    </SignalArenaShell>
  );
}
