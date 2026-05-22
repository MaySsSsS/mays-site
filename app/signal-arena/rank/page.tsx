import type { Metadata } from "next";

import { SignalArenaRank } from "@/components/signal-arena/SignalArenaRank";
import { SignalArenaShell } from "@/components/signal-arena/SignalArenaShell";
import { getSignalArenaPublicData } from "@/lib/signal-arena-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signal Arena Rank",
  description: "MAYS UNIVERSE 的 AI Trader Runner 排名看板。"
};

export default async function SignalArenaRankPage() {
  const data = await getSignalArenaPublicData();

  return (
    <SignalArenaShell active="rank" updatedAt={data.rank.updatedAt}>
      <SignalArenaRank rank={data.rank} />
    </SignalArenaShell>
  );
}
