"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Divider,
  Loading,
  MapGrid,
  SheikahBackground,
  SheikahScanlines,
  SheikahTextTitle
} from "zelda-hyrule-ui";

import styles from "@/styles/tools/hub.module.css";

type LiveTool = {
  eyebrow: string;
  title: string;
  displayTitle: string;
  href: string;
  summary: string;
  status: string;
};

type FutureBay = {
  eyebrow: string;
  title: string;
  displayTitle: string;
  summary: string;
  status: string;
};

type ToolsHubClientProps = {
  liveTools: readonly LiveTool[];
  futureBays: readonly FutureBay[];
};

function navigate(router: ReturnType<typeof useRouter>, href: string) {
  startTransition(() => {
    router.push(href);
  });
}

export default function ToolsHubClient({
  liveTools,
  futureBays
}: ToolsHubClientProps) {
  const router = useRouter();

  return (
    <SheikahBackground color="darkBlue" className={styles.page}>
      <SheikahScanlines animated opacity={0.08} />
      <main className={styles.shell}>
        <nav className={styles.topbar} aria-label="Tools navigation">
          <Button
            variant="sheikah"
            size="small"
            className={styles.backButton}
            onClick={() => navigate(router, "/")}
          >
            Return to Universe
          </Button>
        </nav>

        <section className={styles.hero} aria-labelledby="tools-title">
          <div className={styles.heroMain}>
            <p className={styles.kicker}>Tools Hub</p>
            <SheikahTextTitle
              title="TOOLS"
              description="MAYS TOOLS DIRECTORY"
              className={styles.heroTitle}
            />
            <p className={styles.description}>
              QR, prompt archive, converter, and idea brief modules.
            </p>
          </div>

          <Card variant="sheikah" className={styles.statusPanel}>
            <p className={styles.panelEyebrow}>Slate Status</p>
            <Loading
              size="small"
              tip="Catalog aligned with 4 live modules and 1 pending slot."
              className={styles.panelLoading}
            />
            <Divider variant="sheikah" className={styles.panelDivider} />
            <div className={styles.panelStats} aria-label="Tools overview">
              <div>
                <span className={styles.panelStatValue}>04</span>
                <span className={styles.panelStatLabel}>Online</span>
              </div>
              <div>
                <span className={styles.panelStatValue}>01</span>
                <span className={styles.panelStatLabel}>Queued</span>
              </div>
              <div>
                <span className={styles.panelStatValue}>WEB</span>
                <span className={styles.panelStatLabel}>Surface</span>
              </div>
            </div>
          </Card>
        </section>

        <Divider variant="sheikah" />

        <section className={styles.board} aria-labelledby="tool-grid-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>Directory</p>
              <h2 id="tool-grid-title" className={styles.sectionTitle}>
                TOOL ACCESS
              </h2>
            </div>
          </div>

          <div className={styles.boardFrame}>
            <MapGrid
              variant="large"
              columns={6}
              rows={4}
              className={styles.boardGrid}
            />

            <div className={styles.grid}>
              {liveTools.map((tool) => (
                <Card
                  key={tool.title}
                  variant="sheikah"
                  className={styles.toolCard}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(router, tool.href)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(router, tool.href);
                    }
                  }}
                >
                  <span className={styles.cardEyebrow}>{tool.eyebrow}</span>
                  <span className={styles.cardTitle}>{tool.displayTitle}</span>
                  <p className={styles.cardSummary}>{tool.summary}</p>
                  <span className={styles.cardFooter}>
                    <span className={styles.cardStatus}>{tool.status}</span>
                    <Button
                      variant="primary"
                      size="small"
                      className={styles.cardButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(router, tool.href);
                      }}
                    >
                      Open Module
                    </Button>
                  </span>
                </Card>
              ))}

              {futureBays.map((bay) => (
                <Card key={bay.title} variant="golden" className={styles.futureCard}>
                  <span className={styles.cardEyebrow}>{bay.eyebrow}</span>
                  <span className={styles.cardTitle}>{bay.displayTitle}</span>
                  <p className={styles.cardSummary}>{bay.summary}</p>
                  <span className={styles.cardFooter}>
                    <span className={styles.cardStatus}>{bay.status}</span>
                    <Button
                      variant="ghost"
                      size="small"
                      disabled
                      className={styles.cardButton}
                    >
                      Awaiting Deployment
                    </Button>
                  </span>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SheikahBackground>
  );
}
