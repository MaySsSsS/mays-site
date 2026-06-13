import type { Metadata } from "next";

import { UniverseObservatory } from "@/components/universe/UniverseObservatory";
import { getUniverseObservatoryData } from "@/lib/universe-data";

export const metadata: Metadata = {
  title: "Universe Observatory",
  description: "Mays Universe 的主站观测台，聚合 AI Daily、Quant Lab、Game、Photos 与 Tools 的状态、事件和任务。"
};

export default async function UniverseObservatoryPage() {
  const data = await getUniverseObservatoryData();

  return <UniverseObservatory data={data} />;
}
