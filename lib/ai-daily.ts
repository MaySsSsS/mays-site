import "server-only";

import archiveData from "@/public/data/ai-daily/index.json";
import type { AiDailyArchive, AiDailyEntry } from "@/types/ai-daily";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getAiDailyArchive(): AiDailyArchive {
  return archiveData as AiDailyArchive;
}

export function isAiDailyDate(value: string): boolean {
  return DATE_PATTERN.test(value);
}

export async function getAiDailyEntry(date: string): Promise<AiDailyEntry | null> {
  if (!isAiDailyDate(date)) {
    return null;
  }

  const archive = getAiDailyArchive();
  const exists = archive.entries.some((entry) => entry.date === date);

  if (!exists) {
    return null;
  }

  try {
    const entry = await import(`@/public/data/ai-daily/entries/${date}.json`);
    return entry.default as AiDailyEntry;
  } catch {
    return null;
  }
}

export function getAiDailyDates(): string[] {
  return getAiDailyArchive().entries.map((entry) => entry.date);
}
