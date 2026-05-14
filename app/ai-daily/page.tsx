import type { Metadata } from "next";

import { AiDailyArchive } from "@/components/ai-daily/AiDailyArchive";
import { getAiDailyArchive } from "@/lib/ai-daily";

export const metadata: Metadata = {
  title: "AI Daily",
  description: "MAYS UNIVERSE 的私人 AI 日报档案。"
};

export default function AiDailyPage() {
  return (
    <AiDailyArchive
      archive={getAiDailyArchive()}
      passwordHash={process.env.NEXT_PUBLIC_AI_DAILY_PASSWORD_HASH ?? ""}
    />
  );
}
