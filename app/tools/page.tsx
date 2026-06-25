import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  Divider,
  SheikahBackground,
  SheikahScanlines
} from "zelda-hyrule-ui";

import styles from "@/styles/tools/hub.module.css";

const liveTools = [
  {
    eyebrow: "Tool 01",
    title: "QR Studio",
    href: "/tools/qr",
    summary: "Generate polished QR codes for links, notes, and quick share flows.",
    status: "Public"
  },
  {
    eyebrow: "Tool 02",
    title: "Style Prompt Index",
    href: "/tools/style-prompt",
    summary: "Browse UI-Prompt style data, filter design families, and copy bilingual prompts.",
    status: "Data Mirror"
  },
  {
    eyebrow: "Tool 03",
    title: "Word to Markdown",
    href: "/tools/word-to-markdown",
    summary: "Convert .docx files into Markdown in the browser, with image assets kept in a ZIP export.",
    status: "Browser Local"
  },
  {
    eyebrow: "Tool 04",
    title: "Idea Lab",
    href: "/tools/idea-lab",
    summary: "Turn a rough idea into a scoped brief, validation checklist, and Codex-ready prompt.",
    status: "Local Draft"
  }
] as const;

const futureBays = [
  {
    eyebrow: "Next Slot",
    title: "More Tools Pending",
    summary:
      "Future utilities will slot into the same lab grid once they are ready to ship.",
    status: "Calibrating"
  }
] as const;

export const metadata: Metadata = {
  title: "Tools",
  description: "使用 zelda-hyrule-ui 重构后的工具箱入口，包含二维码生成器、UI 风格提示词索引、Word 转 Markdown 和 Idea Lab。"
};

export default function ToolsHubPage() {
  return (
    <SheikahBackground color="darkBlue" className={styles.page}>
      <SheikahScanlines animated opacity={0.08} />
      <main className={styles.shell}>
        <nav className={styles.topbar} aria-label="Tools navigation">
          <Link href="/" className={styles.backLink}>
            Return to Universe
          </Link>
        </nav>

        <section className={styles.hero} aria-labelledby="tools-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Tools Hub</p>
            <h1 id="tools-title" className={styles.title}>
              Tools
            </h1>
            <div className={styles.subtitleBlock}>
              <p className={styles.subtitle}>Mays Tools Directory</p>
              <p className={styles.description}>QR, prompt archive, converter, and idea brief modules.</p>
            </div>
          </div>
        </section>

        <Divider variant="sheikah" />

        <section className={styles.board} aria-labelledby="tool-grid-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>Directory</p>
              <h2 id="tool-grid-title" className={styles.sectionTitle}>
                Tool access
              </h2>
            </div>
          </div>

          <div className={styles.grid}>
            {liveTools.map((tool) => (
              <Link key={tool.title} href={tool.href} className={styles.toolLink}>
                <Card variant="sheikah" className={styles.toolCard}>
                  <span className={styles.cardEyebrow}>{tool.eyebrow}</span>
                  <span className={styles.cardTitle}>{tool.title}</span>
                  <p className={styles.cardSummary}>{tool.summary}</p>
                  <span className={styles.cardFooter}>
                    <span className={styles.cardStatus}>{tool.status}</span>
                    <span className={styles.cardAction}>Open Module</span>
                  </span>
                </Card>
              </Link>
            ))}

            {futureBays.map((bay) => (
              <Card key={bay.title} variant="golden" className={styles.futureCard}>
                <span className={styles.cardEyebrow}>{bay.eyebrow}</span>
                <span className={styles.cardTitle}>{bay.title}</span>
                <p className={styles.cardSummary}>{bay.summary}</p>
                <span className={styles.cardFooter}>
                  <span className={styles.cardStatus}>{bay.status}</span>
                  <span className={styles.cardActionMuted}>Awaiting Deployment</span>
                </span>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </SheikahBackground>
  );
}
