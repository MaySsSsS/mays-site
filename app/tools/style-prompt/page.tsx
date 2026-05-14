import type { Metadata } from "next";

import { StylePromptBrowser } from "@/components/tools/StylePromptBrowser";

export const metadata: Metadata = {
  title: "风格提示词库",
  description: "浏览、检索和复制 UI-Prompt 风格提示词数据。"
};

export default function StylePromptPage() {
  return <StylePromptBrowser />;
}
