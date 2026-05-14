import type { Metadata } from "next";

import { WordToMarkdown } from "@/components/tools/WordToMarkdown";

export const metadata: Metadata = {
  title: "Word to Markdown",
  description: "在浏览器中把 .docx Word 文档转换为 Markdown，并支持下载 .md 或 ZIP。"
};

export default function WordToMarkdownPage() {
  return <WordToMarkdown />;
}
