import type { Metadata } from "next";

import { SignalArenaRank } from "@/components/signal-arena/SignalArenaRank";
import { SignalArenaShell } from "@/components/signal-arena/SignalArenaShell";
import { getSignalArenaPublicData } from "@/lib/signal-arena-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quant Lab Rank",
  description: "MAYS UNIVERSE 的 Q-Alpha v1 排名看板。"
};

export default async function SignalArenaRankPage() {
  const data = await getSignalArenaPublicData();

  return (
    <SignalArenaShell active="rank" updatedAt={data.rank.updatedAt}>
      <SignalArenaRank rank={data.rank} />
    </SignalArenaShell>
  );
}
