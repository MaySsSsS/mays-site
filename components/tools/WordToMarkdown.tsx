"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import mammoth from "mammoth";

import styles from "@/styles/tools/word-to-markdown.module.css";

const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = "12MB";
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type FileState =
  | {
      status: "idle";
      file: null;
      error: null;
    }
  | {
      status: "ready";
      file: File;
      error: null;
    }
  | {
      status: "error";
      file: File | null;
      error: string;
    };

type ConversionStatus = "idle" | "converting" | "converted" | "error";

type ConversionState = {
  status: ConversionStatus;
  markdown: string;
  assets: GeneratedAsset[];
  warnings: string[];
  error: string | null;
};

type CopyStatus = "idle" | "success" | "error";
type ZipStatus = "idle" | "preparing" | "success" | "error";

type GeneratedAsset = {
  fileName: string;
  path: string;
  contentType: string;
  data: ArrayBuffer;
};

type MammothMessage =
  | {
      type: "warning";
      message: string;
    }
  | {
      type: "error";
      message: string;
      error?: unknown;
    };

type MammothResult = {
  value: string;
  messages: MammothMessage[];
};

type MammothImage = {
  contentType: string;
  readAsArrayBuffer: () => Promise<ArrayBuffer>;
};

type MammothMarkdown = typeof mammoth & {
  images: {
    imgElement: (
      convertImage: (image: MammothImage) => Promise<{ src: string }>
    ) => unknown;
  };
  convertToMarkdown: (
    input: { arrayBuffer: ArrayBuffer },
    options?: {
      includeEmbeddedStyleMap?: boolean;
      includeDefaultStyleMap?: boolean;
      ignoreEmptyParagraphs?: boolean;
      convertImage?: unknown;
    }
  ) => Promise<MammothResult>;
};

const initialState: FileState = {
  status: "idle",
  file: null,
  error: null
};

const initialConversionState: ConversionState = {
  status: "idle",
  markdown: "",
  assets: [],
  warnings: [],
  error: null
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))}KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

function validateDocxFile(file: File): string | null {
  const normalizedName = file.name.toLowerCase();

  if (normalizedName.endsWith(".doc") && !normalizedName.endsWith(".docx")) {
    return "当前版本只支持 .docx，不支持旧版 .doc 文件。";
  }

  if (!normalizedName.endsWith(".docx") && file.type !== DOCX_MIME_TYPE) {
    return "请选择 .docx 格式的 Word 文件。";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `文件超过 ${MAX_FILE_SIZE_LABEL}，请先压缩或拆分文档。`;
  }

  return null;
}

function sanitizeBaseName(fileName: string) {
  const baseName = fileName.replace(/\.docx$/i, "").trim() || "document";
  return baseName.replace(/[\\/:*?"<>|]+/g, "-");
}

function getMarkdownDownloadName(fileName: string) {
  return `${sanitizeBaseName(fileName)}.md`;
}

function getZipDownloadName(fileName: string) {
  return `${sanitizeBaseName(fileName)}.zip`;
}

function getImageExtension(contentType: string) {
  switch (contentType.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    case "image/webp":
      return "webp";
    case "image/bmp":
      return "bmp";
    case "image/tiff":
      return "tiff";
    default:
      return "bin";
  }
}

function formatMammothMessage(message: MammothMessage) {
  const prefix = message.type === "error" ? "错误" : "警告";
  return `${prefix}：${message.message}`;
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadTextFile(fileName: string, content: string) {
  downloadBlob(fileName, new Blob([content], { type: "text/markdown;charset=utf-8" }));
}

export function WordToMarkdown() {
  const inputRef = useRef<HTMLInputElement>(null);
  const conversionRunRef = useRef(0);
  const [fileState, setFileState] = useState<FileState>(initialState);
  const [conversionState, setConversionState] = useState<ConversionState>(initialConversionState);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [zipStatus, setZipStatus] = useState<ZipStatus>("idle");
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const error = validateDocxFile(file);

    if (error) {
      conversionRunRef.current += 1;
      setFileState({
        status: "error",
        file,
        error
      });
      setConversionState(initialConversionState);
      setCopyStatus("idle");
      setZipStatus("idle");
      return;
    }

    setFileState({
      status: "ready",
      file,
      error: null
    });
    setConversionState(initialConversionState);
    setCopyStatus("idle");
    setZipStatus("idle");
    void convertFile(file);
  }

  function handleReset() {
    conversionRunRef.current += 1;
    setFileState(initialState);
    setConversionState(initialConversionState);
    setCopyStatus("idle");
    setZipStatus("idle");
    setIsDragging(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function convertFile(file: File) {
    const runId = conversionRunRef.current + 1;
    conversionRunRef.current = runId;
    setCopyStatus("idle");
    setZipStatus("idle");
    setConversionState({
      status: "converting",
      markdown: "",
      assets: [],
      warnings: [],
      error: null
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const converter = mammoth as MammothMarkdown;
      const assets: GeneratedAsset[] = [];
      const result = await converter.convertToMarkdown(
        { arrayBuffer },
        {
          includeEmbeddedStyleMap: true,
          includeDefaultStyleMap: true,
          ignoreEmptyParagraphs: true,
          convertImage: converter.images.imgElement(async (image) => {
            const imageIndex = assets.length + 1;
            const extension = getImageExtension(image.contentType);
            const fileName = `image-${imageIndex}.${extension}`;
            const path = `./assets/${fileName}`;

            assets.push({
              fileName,
              path,
              contentType: image.contentType,
              data: await image.readAsArrayBuffer()
            });

            return { src: path };
          })
        }
      );
      const markdown = result.value.trim();
      const warnings = result.messages.map(formatMammothMessage);

      if (runId !== conversionRunRef.current) {
        return;
      }

      setConversionState({
        status: "converted",
        markdown,
        assets,
        warnings:
          markdown.length > 0
            ? warnings
            : [...warnings, "提示：转换完成，但文档中没有可输出的文本内容。"],
        error: null
      });
    } catch (error) {
      if (runId !== conversionRunRef.current) {
        return;
      }

      setConversionState({
        status: "error",
        markdown: "",
        assets: [],
        warnings: [],
        error: error instanceof Error ? error.message : "转换失败，请换一个 .docx 文件再试。"
      });
    }
  }

  async function handleCopy() {
    if (!conversionState.markdown) {
      return;
    }

    try {
      await navigator.clipboard.writeText(conversionState.markdown);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  }

  function handleDownloadMarkdown() {
    if (fileState.status !== "ready" || !conversionState.markdown) {
      return;
    }

    downloadTextFile(getMarkdownDownloadName(fileState.file.name), conversionState.markdown);
  }

  async function handleDownloadZip() {
    if (fileState.status !== "ready" || !conversionState.markdown || zipStatus === "preparing") {
      return;
    }

    setZipStatus("preparing");

    try {
      const zip = new JSZip();
      const assetsFolder = zip.folder("assets");

      zip.file("document.md", conversionState.markdown);
      conversionState.assets.forEach((asset) => {
        assetsFolder?.file(asset.fileName, asset.data, { binary: true });
      });

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        mimeType: "application/zip"
      });

      downloadBlob(getZipDownloadName(fileState.file.name), blob);
      setZipStatus("success");
    } catch {
      setZipStatus("error");
    }
  }

  const hasMarkdown = conversionState.status === "converted" && conversionState.markdown.length > 0;

  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />

      <section className={styles.shell}>
        <div className={styles.topline}>
          <Link href="/tools" className={styles.backLink}>
            Signal Lab
          </Link>
          <span className={styles.toolBadge}>Local Converter</span>
        </div>

        <header className={styles.header}>
          <p className={styles.kicker}>Word to Markdown</p>
          <h1 className={styles.title}>Word 转 Markdown</h1>
          <p className={styles.description}>
            选择一个 `.docx` 文件，在浏览器中转换为 Markdown。支持复制结果、
            下载 `.md`，也可以把 Markdown 和图片资源一起打包成 ZIP。
          </p>
        </header>

        <div className={styles.workspace}>
          <section className={styles.panel} aria-labelledby="upload-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Local File</p>
                <h2 id="upload-title" className={styles.panelTitle}>
                  选择一个 .docx
                </h2>
              </div>
              <button type="button" className={styles.resetButton} onClick={handleReset}>
                重置
              </button>
            </div>

            <label
              className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                handleFile(event.dataTransfer.files[0]);
              }}
            >
              <input
                ref={inputRef}
                className={styles.fileInput}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <span className={styles.dropzoneTitle}>拖入文件，或点击选择</span>
              <span className={styles.dropzoneHint}>仅支持 .docx，最大 {MAX_FILE_SIZE_LABEL}</span>
            </label>

            {fileState.status === "ready" ? (
              <div className={styles.fileCard} role="status">
                <span className={styles.fileStatus}>Ready</span>
                <strong>{fileState.file.name}</strong>
                <span>{formatFileSize(fileState.file.size)}</span>
              </div>
            ) : null}

            {fileState.status === "error" ? (
              <div className={styles.errorCard} role="alert">
                <span className={styles.fileStatus}>Rejected</span>
                <strong>{fileState.file?.name ?? "无法读取文件"}</strong>
                <span>{fileState.error}</span>
              </div>
            ) : null}

            <div className={styles.actionRow}>
              <span className={styles.actionHint}>
                选择文件后会自动转换。文件只在当前浏览器内处理，不会上传。
              </span>
            </div>
          </section>
        </div>

        <section className={styles.resultPanel} aria-labelledby="result-title">
          <div className={styles.resultHeader}>
            <div>
              <p className={styles.panelLabel}>Markdown Output</p>
              <h2 id="result-title" className={styles.panelTitle}>
                转换结果
              </h2>
            </div>

            <div className={styles.resultActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleCopy}
                disabled={!hasMarkdown}
              >
                复制 Markdown
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleDownloadMarkdown}
                disabled={!hasMarkdown}
              >
                下载 .md
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleDownloadZip}
                disabled={!hasMarkdown || zipStatus === "preparing"}
              >
                {zipStatus === "preparing" ? "打包中..." : "下载 ZIP"}
              </button>
            </div>
          </div>

          <div className={styles.statusCard} role="status" aria-live="polite">
            {conversionState.status === "idle" ? "选择 .docx 文件后会自动开始转换。" : null}
            {conversionState.status === "converting" ? "正在解析 Word 文档并生成 Markdown..." : null}
            {conversionState.status === "converted"
              ? `转换完成，已生成 ${conversionState.markdown.length.toLocaleString("zh-CN")} 个字符。`
              : null}
            {conversionState.status === "error" ? conversionState.error : null}
            {copyStatus === "success" ? " 已复制到剪贴板。" : null}
            {copyStatus === "error" ? " 复制失败，请手动选择下方内容复制。" : null}
            {zipStatus === "success" ? " ZIP 已生成并开始下载。" : null}
            {zipStatus === "error" ? " ZIP 打包失败，请重试。" : null}
          </div>

          {conversionState.status === "converted" ? (
            <div className={styles.assetCard} role="status">
              <strong>图片资源</strong>
              {conversionState.assets.length > 0 ? (
                <>
                  <span>已提取 {conversionState.assets.length} 个内嵌图片，Markdown 已写入相对路径。</span>
                  <ul>
                    {conversionState.assets.map((asset) => (
                      <li key={asset.path}>
                        {asset.path} · {asset.contentType}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <span>这个文档没有检测到内嵌图片；ZIP 会包含 Markdown 文件。</span>
              )}
            </div>
          ) : null}

          {conversionState.warnings.length > 0 ? (
            <div className={styles.warningCard} role="status">
              <strong>转换提示</strong>
              <ul>
                {conversionState.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <textarea
            className={styles.markdownOutput}
            readOnly
            value={conversionState.markdown}
            placeholder="Markdown 会显示在这里。"
            aria-label="生成的 Markdown"
          />
        </section>
      </section>
    </main>
  );
}
