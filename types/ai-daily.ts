export type AiDailyMode = "ai_summary" | "mirror_fallback";

export type AiDailySectionItem = {
  title: string;
  body: string;
};

export type AiDailySection = {
  title: string;
  items: AiDailySectionItem[];
};

export type AiDailyArchiveEntry = {
  date: string;
  title: string;
  mode: AiDailyMode;
  summary: string[];
  updatedAt: string;
  path: string;
};

export type AiDailyArchive = {
  latestDate: string | null;
  entries: AiDailyArchiveEntry[];
};

export type AiDailyEntry = {
  date: string;
  title: string;
  mode: AiDailyMode;
  updatedAt: string;
  summary: string[];
  sections: AiDailySection[];
};
