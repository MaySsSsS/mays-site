import type { Metadata } from "next";
import Link from "next/link";

import styles from "@/styles/tools/hub.module.css";

const liveTools = [
  {
    eyebrow: "Live Module",
    title: "QR Studio",
    href: "/tools/qr",
    summary: "Generate polished QR codes for links, notes, and quick share flows.",
    status: "Public"
  },
  {
    eyebrow: "Prompt Archive",
    title: "Style Prompt Index",
    href: "/tools/style-prompt",
    summary: "Browse UI-Prompt style data, filter design families, and copy bilingual prompts.",
    status: "Data Mirror"
  },
  {
    eyebrow: "Local Converter",
    title: "Word to Markdown",
    href: "/tools/word-to-markdown",
    summary: "Convert .docx files into Markdown in the browser, with image assets kept in a ZIP export.",
    status: "Browser Local"
  },
  {
    eyebrow: "Project Brief",
    title: "Idea Lab",
    href: "/tools/idea-lab",
    summary: "Turn a rough idea into a scoped brief, validation checklist, and Codex-ready prompt.",
    status: "Local Draft"
  }
];

const futureBays = [
  {
    eyebrow: "Expansion Dock",
    title: "More Signals Pending",
    summary:
      "Future utilities will slot into the same lab grid once they are ready to ship.",
    status: "Calibrating"
  }
];

export const metadata: Metadata = {
  title: "Signal Lab",
  description: "一个带有未来感视觉的工具箱入口，包含二维码生成器、UI 风格提示词索引、Word 转 Markdown 和 Idea Lab。"
};

export default function ToolsHubPage() {
  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.ambientSecondary} aria-hidden="true" />

      <section className={styles.hero}>
        <div className={styles.heroTopline}>
          <Link href="/" className={styles.backLink}>
            Return to Universe
          </Link>
          <span className={styles.heroTag}>Tools</span>
        </div>

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Signal Lab</p>
            <h1 className={styles.title}>Iridescent instruments for the Mays Universe.</h1>
            <p className={styles.description}>
              This branch keeps the worldbuilding intact, but the job is simple:
              clear tools, fast entry, and no guessing what each module does.
            </p>
          </div>

          <div className={styles.heroLens} aria-hidden="true">
            <div className={styles.heroLensCore} />
            <div className={styles.heroLensSweep} />
            <div className={styles.heroLensLabel}>
              {String(liveTools.length).padStart(2, "0")} active signals
            </div>
          </div>
        </div>
      </section>

      <section className={styles.gridSection} aria-labelledby="tool-grid-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionLabel}>Directory</p>
            <h2 id="tool-grid-title" className={styles.sectionTitle}>
              Tool access
            </h2>
          </div>
          <p className={styles.sectionNote}>Concrete tools live here, not on the homepage portal.</p>
        </div>

        <div className={styles.grid}>
          {liveTools.map((tool) => (
            <Link key={tool.title} href={tool.href} className={styles.liveCard}>
              <span className={styles.cardEyebrow}>{tool.eyebrow}</span>
              <span className={styles.cardTitle}>{tool.title}</span>
              <span className={styles.cardSummary}>{tool.summary}</span>
              <span className={styles.cardFooter}>
                <span className={styles.cardStatus}>{tool.status}</span>
                <span className={styles.cardAction}>Open Module</span>
              </span>
            </Link>
          ))}

          {futureBays.map((bay) => (
            <div key={bay.title} className={styles.futureCard}>
              <span className={styles.cardEyebrow}>{bay.eyebrow}</span>
              <span className={styles.cardTitle}>{bay.title}</span>
              <span className={styles.cardSummary}>{bay.summary}</span>
              <span className={styles.cardFooter}>
                <span className={styles.cardStatus}>{bay.status}</span>
                <span className={styles.cardActionMuted}>Awaiting Deployment</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
