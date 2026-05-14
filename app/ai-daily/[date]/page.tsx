import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AiDailyDetail } from "@/components/ai-daily/AiDailyDetail";
import { getAiDailyDates, getAiDailyEntry } from "@/lib/ai-daily";

type AiDailyDetailPageProps = {
  params: Promise<{
    date: string;
  }>;
};

export async function generateMetadata({ params }: AiDailyDetailPageProps): Promise<Metadata> {
  const { date } = await params;
  const entry = await getAiDailyEntry(date);

  return {
    title: entry?.title ?? "AI Daily",
    description: entry?.summary[0] ?? "MAYS UNIVERSE 的私人 AI 日报。"
  };
}

export function generateStaticParams() {
  return getAiDailyDates().map((date) => ({ date }));
}

export default async function AiDailyDetailPage({ params }: AiDailyDetailPageProps) {
  const { date } = await params;
  const entry = await getAiDailyEntry(date);

  if (!entry) {
    notFound();
  }

  return (
    <AiDailyDetail
      entry={entry}
      passwordHash={process.env.NEXT_PUBLIC_AI_DAILY_PASSWORD_HASH ?? ""}
    />
  );
}
