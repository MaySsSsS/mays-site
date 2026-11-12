import type { Metadata } from "next";
import ToolsHubClient from "@/components/tools/ToolsHubClient";

const liveTools = [
  {
    eyebrow: "Tool 01",
    title: "QR Studio",
    displayTitle: "QR STUDIO",
    href: "/tools/qr",
    summary: "生成适合链接、便签和快速分享场景的精致二维码。",
    status: "Public"
  },
  {
    eyebrow: "Tool 02",
    title: "Style Prompt Index",
    displayTitle: "STYLE PROMPT INDEX",
    href: "/tools/style-prompt",
    summary: "浏览 UI-Prompt 风格数据，筛选设计流派，并复制中英双语提示词。",
    status: "Data Mirror"
  },
  {
    eyebrow: "Tool 03",
    title: "Word to Markdown",
    displayTitle: "WORD TO MARKDOWN",
    href: "/tools/word-to-markdown",
    summary: "在浏览器中将 .docx 转成 Markdown，并把图片资源一并打包导出。",
    status: "Browser Local"
  },
  {
    eyebrow: "Tool 04",
    title: "Idea Lab",
    displayTitle: "IDEA LAB",
    href: "/tools/idea-lab",
    summary: "把模糊想法整理成范围清晰的 brief、验证清单和可直接交给 Codex 的提示词。",
    status: "Local Draft"
  }
] as const;

const futureBays = [
  {
    eyebrow: "Next Slot",
    title: "More Tools Pending",
    displayTitle: "MORE TOOLS PENDING",
    summary:
      "后续工具准备完成后，会继续按同一套目录结构接入这里。",
    status: "Calibrating"
  }
] as const;

export const metadata: Metadata = {
  title: "Tools",
  description: "使用 zelda-hyrule-ui 重构后的工具箱入口，包含二维码生成器、UI 风格提示词索引、Word 转 Markdown 和 Idea Lab。"
};

export default function ToolsHubPage() {
  return <ToolsHubClient liveTools={liveTools} futureBays={futureBays} />;
}
