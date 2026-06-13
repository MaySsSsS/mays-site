import type { Metadata } from "next";

import { IdeaLab } from "@/components/tools/IdeaLab";

export const metadata: Metadata = {
  title: "Idea Lab",
  description: "把零散想法整理成项目简报、行动拆解、风险清单、验收清单和可复制给 Codex 的开发提示词。"
};

export default function IdeaLabPage() {
  return <IdeaLab />;
}
