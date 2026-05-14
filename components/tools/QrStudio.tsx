"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

import styles from "@/styles/tools/qr.module.css";

const DEFAULT_CONTENT = "https://maysssss.cn/tools";
const DEFAULT_FOREGROUND = "#10111a";
const DEFAULT_BACKGROUND = "#f7f7fb";

export function QrStudio() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [size, setSize] = useState(280);
  const [margin, setMargin] = useState(2);
  const [foreground, setForeground] = useState(DEFAULT_FOREGROUND);
  const [background, setBackground] = useState(DEFAULT_BACKGROUND);
  const [svgMarkup, setSvgMarkup] = useState("");
  const [pngUrl, setPngUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const deferredContent = useDeferredValue(content.trim());

  useEffect(() => {
    let active = true;
    const nextValue = deferredContent;

    if (!nextValue) {
      setSvgMarkup("");
      setPngUrl("");
      setError(null);
      setIsRendering(false);
      return () => {
        active = false;
      };
    }

    async function renderQr() {
      setIsRendering(true);

      try {
        const options = {
          margin,
          width: size,
          color: {
            dark: foreground,
            light: background
          }
        };

        const [nextSvg, nextPng] = await Promise.all([
          QRCode.toString(nextValue, {
            ...options,
            type: "svg"
          }),
          QRCode.toDataURL(nextValue, options)
        ]);

        if (!active) {
          return;
        }

        startTransition(() => {
          setSvgMarkup(nextSvg);
          setPngUrl(nextPng);
          setError(null);
        });
      } catch (renderError) {
        if (!active) {
          return;
        }

        setSvgMarkup("");
        setPngUrl("");
        setError(renderError instanceof Error ? renderError.message : "Unable to render QR code.");
      } finally {
        if (active) {
          setIsRendering(false);
        }
      }
    }

    void renderQr();

    return () => {
      active = false;
    };
  }, [background, deferredContent, foreground, margin, size]);

  function handleReset() {
    setContent(DEFAULT_CONTENT);
    setSize(280);
    setMargin(2);
    setForeground(DEFAULT_FOREGROUND);
    setBackground(DEFAULT_BACKGROUND);
  }

  function handleDownloadPng() {
    if (!pngUrl) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = pngUrl;
    anchor.download = "qr-studio.png";
    anchor.click();
  }

  function handleDownloadSvg() {
    if (!svgMarkup) {
      return;
    }

    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "qr-studio.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.ambientSecondary} aria-hidden="true" />

      <section className={styles.shell}>
        <div className={styles.topline}>
          <Link href="/tools" className={styles.backLink}>
            Back to Signal Lab
          </Link>
          <Link href="/" className={styles.backLinkSecondary}>
            Universe
          </Link>
        </div>

        <div className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.kicker}>QR Studio</p>
            <h1 className={styles.title}>Build a scan-ready code without leaving the lab.</h1>
            <p className={styles.description}>
              Frontend-only, public-safe, and tuned for quick export in both raster
              and vector formats.
            </p>
          </div>

          <div className={styles.headerBadge}>
            <span className={styles.headerBadgeLabel}>Active Module</span>
            <span className={styles.headerBadgeValue}>01</span>
          </div>
        </div>

        <div className={styles.workspace}>
          <section className={styles.controls} aria-labelledby="qr-controls-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Input</p>
                <h2 id="qr-controls-title" className={styles.panelTitle}>
                  Configure payload
                </h2>
              </div>
              <button type="button" className={styles.resetButton} onClick={handleReset}>
                Reset
              </button>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Content or URL</span>
              <textarea
                className={styles.textarea}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={6}
                placeholder="Paste text or a link to generate a QR code."
              />
            </label>

            <div className={styles.sliderGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Size</span>
                <div className={styles.rangeRow}>
                  <input
                    className={styles.range}
                    type="range"
                    min={160}
                    max={520}
                    step={20}
                    value={size}
                    onChange={(event) => setSize(Number(event.target.value))}
                  />
                  <span className={styles.rangeValue}>{size}px</span>
                </div>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Quiet Zone</span>
                <div className={styles.rangeRow}>
                  <input
                    className={styles.range}
                    type="range"
                    min={0}
                    max={8}
                    step={1}
                    value={margin}
                    onChange={(event) => setMargin(Number(event.target.value))}
                  />
                  <span className={styles.rangeValue}>{margin}</span>
                </div>
              </label>
            </div>

            <div className={styles.colorGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Foreground</span>
                <div className={styles.colorRow}>
                  <input
                    className={styles.colorInput}
                    type="color"
                    value={foreground}
                    onChange={(event) => setForeground(event.target.value)}
                  />
                  <span className={styles.colorValue}>{foreground}</span>
                </div>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Background</span>
                <div className={styles.colorRow}>
                  <input
                    className={styles.colorInput}
                    type="color"
                    value={background}
                    onChange={(event) => setBackground(event.target.value)}
                  />
                  <span className={styles.colorValue}>{background}</span>
                </div>
              </label>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={handleDownloadPng}
                disabled={!pngUrl}
              >
                Download PNG
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={handleDownloadSvg}
                disabled={!svgMarkup}
              >
                Download SVG
              </button>
            </div>
          </section>

          <section className={styles.preview} aria-labelledby="qr-preview-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Preview</p>
                <h2 id="qr-preview-title" className={styles.panelTitle}>
                  Live output
                </h2>
              </div>
              <span className={styles.previewStatus}>
                {isRendering ? "Rendering" : svgMarkup ? "Ready" : "Waiting"}
              </span>
            </div>

            <div className={styles.previewSurface}>
              {svgMarkup ? (
                <div
                  className={styles.svgPreview}
                  aria-label="QR code preview"
                  dangerouslySetInnerHTML={{ __html: svgMarkup }}
                />
              ) : (
                <div className={styles.emptyPreview}>
                  <p className={styles.emptyTitle}>No signal yet</p>
                  <p className={styles.emptyText}>Enter text or a URL to generate the first preview.</p>
                </div>
              )}
            </div>

            <div className={styles.previewMeta}>
              <div>
                <span className={styles.metaLabel}>Payload</span>
                <p className={styles.metaValue}>{deferredContent || "Empty"}</p>
              </div>
              <div>
                <span className={styles.metaLabel}>Format</span>
                <p className={styles.metaValue}>PNG + SVG export</p>
              </div>
            </div>

            <p className={styles.statusMessage} aria-live="polite">
              {error ?? "All rendering happens locally in the browser. No upload, no server execution."}
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
