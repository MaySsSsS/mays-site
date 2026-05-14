"use client";

import type { CSSProperties } from "react";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import styles from "@/styles/tools/style-prompt.module.css";

type PromptLanguage = "zh-CN" | "en-US";
type PromptKind = "style" | "custom";

type LocalizedText = {
  zh: string;
  en: string;
};

type PromptText = Record<PromptLanguage, string>;

type PromptPair = {
  custom: PromptText;
  style: PromptText;
};

type PromptSource = {
  prompt: string;
  manifest: string;
};

type StyleTemplate = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  prompts: PromptPair;
  source: PromptSource;
};

type StyleDemo = {
  html: string;
  css: string;
  source: string;
};

type StyleFamily = {
  id: string;
  familyId: string;
  category: {
    id: string;
    name: string;
  };
  name: LocalizedText;
  description: LocalizedText;
  tags: string[];
  relatedStyles: string[];
  prompts: PromptPair;
  templates: StyleTemplate[];
  source: PromptSource;
  demo: StyleDemo | null;
};

type StylePromptData = {
  source: {
    name: string;
    repository: string;
    website: string;
    importedAt: string;
    note: string;
  };
  categories: Array<{
    id: string;
    name: string;
  }>;
  families: StyleFamily[];
};

const LANGUAGE_LABELS: Record<PromptLanguage, string> = {
  "zh-CN": "中文",
  "en-US": "英文"
};

const PROMPT_KIND_LABELS: Record<PromptKind, string> = {
  style: "风格提示词",
  custom: "自定义提示词"
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "全部",
  core: "核心",
  visual: "视觉",
  retro: "复古",
  interaction: "交互",
  layout: "布局"
};

const TEMPLATE_FALLBACK_NOTES: Record<PromptLanguage, string> = {
  "zh-CN": "当前模板没有单独发布 prompt 文本，因此这里展示的是该风格家族的基础 prompt。",
  "en-US": "This template has no standalone prompt text upstream, so the family base prompt is shown here."
};

const ALLOWED_SCRIPT_SOURCES = [
  /https:\/\/cdn\.tailwindcss\.com(?:\/|$)/i,
  /https:\/\/cdn\.jsdelivr\.net\/npm\/tailwindcss/i
];

const ALLOWED_STYLESHEET_SOURCES = [
  /https:\/\/fonts\.googleapis\.com/i,
  /https:\/\/fonts\.gstatic\.com/i,
  /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/i
];

const DEFAULT_STYLESHEETS = [
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Rajdhani:wght@500;600;700&display=swap"
];

const STYLE_PROMPT_DATA_URL = "/data/ui-prompt-styles.json?v=2026-05-05-audit";
const STYLE_PROMPT_PREVIEW_VERSION = "2026-05-05-preview";
const TAILWIND_CDN_SCRIPT = "https://cdn.tailwindcss.com";
const COPY_PROMPT_LABEL = "复制提示词";
const COPIED_LABEL = "已复制";
const SIGNATURE_LANGUAGES: PromptLanguage[] = ["zh-CN", "en-US"];

const PREVIEW_ADJUSTMENTS: Record<
  string,
  {
    scale: number;
  }
> = {
  "core-fluent2": { scale: 1.34 },
  "visual-spotlight": { scale: 1.72 }
};

// These previews exist as PNG files but rendered as effectively blank frames during audit.
const INVALID_PREVIEW_FAMILY_IDS = new Set(["visual-organic"]);

const TAILWIND_CLASS_PATTERN =
  /^(?:-)?(?:absolute|backdrop-|bg-|blur|border|bottom-|cursor-|duration-|flex|font-|from-|gap-|grid|group|h-|hover:|inset-|items-|justify-|left-|m[blrtxy]?-|max-w-|mb-|min-h-|opacity-|overflow-|p[blrtxy]?-|relative|right-|rotate-|rounded|scale-|shadow|space-|text-|to-|top-|transform|transition|via-|w-|z-)/;

function getLocalizedText(text: LocalizedText, language: PromptLanguage) {
  return language === "zh-CN" ? text.zh || text.en : text.en || text.zh;
}

function getPromptContent(prompts: PromptPair, kind: PromptKind, language: PromptLanguage) {
  return prompts[kind][language] || prompts.style[language] || prompts.custom[language] || "";
}

function getCategoryLabel(categoryId: string) {
  return CATEGORY_LABELS[categoryId] || categoryId;
}

function getResolvedPromptState(
  family: StyleFamily | null,
  template: StyleTemplate | null,
  kind: PromptKind,
  language: PromptLanguage
) {
  const templatePromptContent = template ? getPromptContent(template.prompts, kind, language) : "";
  const familyPromptContent = family ? getPromptContent(family.prompts, kind, language) : "";
  const promptContent = templatePromptContent || familyPromptContent;
  const isUsingFamilyPromptFallback = Boolean(template && !templatePromptContent && familyPromptContent);
  const activeSource = templatePromptContent
    ? template?.source ?? family?.source ?? null
    : family?.source ?? template?.source ?? null;

  return {
    promptContent,
    activeSource,
    isUsingFamilyPromptFallback
  };
}

function normalizePromptSignatureValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getEffectivePromptSignature(
  family: StyleFamily,
  template: StyleTemplate | null,
  kind: PromptKind
) {
  return SIGNATURE_LANGUAGES.map((language) =>
    normalizePromptSignatureValue(getResolvedPromptState(family, template, kind, language).promptContent)
  ).join("||");
}

function getDistinctTemplates(family: StyleFamily, kind: PromptKind) {
  const seenSignatures = new Set([getEffectivePromptSignature(family, null, kind)]);
  const distinctTemplates: StyleTemplate[] = [];

  for (const template of family.templates) {
    const signature = getEffectivePromptSignature(family, template, kind);

    if (seenSignatures.has(signature)) {
      continue;
    }

    seenSignatures.add(signature);
    distinctTemplates.push(template);
  }

  return distinctTemplates;
}

function getPreviewStyle(familyId: string): CSSProperties | undefined {
  const adjustment = PREVIEW_ADJUSTMENTS[familyId];

  if (!adjustment) {
    return undefined;
  }

  return {
    "--preview-scale": String(adjustment.scale)
  } as CSSProperties;
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeStyleContent(value: string) {
  return value.replace(/<\/style/gi, "<\\/style");
}

function isAllowedScriptSource(src: string) {
  return ALLOWED_SCRIPT_SOURCES.some((pattern) => pattern.test(src));
}

function isAllowedStylesheetSource(href: string) {
  return ALLOWED_STYLESHEET_SOURCES.some((pattern) => pattern.test(href));
}

function hasInlineStyles(html: string) {
  return /<style[\s>]/i.test(html);
}

function hasTailwindUtilityClasses(html: string) {
  const classMatches = html.matchAll(/\bclass=(["'])([^"']*)\1/gi);

  for (const match of classMatches) {
    const classes = match[2].split(/\s+/).filter(Boolean);

    if (classes.some((className) => TAILWIND_CLASS_PATTERN.test(className))) {
      return true;
    }
  }

  return false;
}

function needsTailwindRuntime(html: string, css: string) {
  return !css.trim() && !hasInlineStyles(html) && hasTailwindUtilityClasses(html);
}

function extractBodyInner(html: string) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  if (bodyMatch?.[1]) {
    return bodyMatch[1];
  }

  return html
    .replace(/<!doctype[^>]*>/i, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "");
}

function extractInlineStyles(html: string) {
  const styles: string[] = [];
  const htmlWithoutStyles = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css: string) => {
    styles.push(css || "");
    return "";
  });

  return {
    html: htmlWithoutStyles,
    styles: styles.join("\n")
  };
}

function extractAllowedStylesheets(html: string) {
  const stylesheets = new Set(DEFAULT_STYLESHEETS);

  html.replace(/<link\b[^>]*href=(["'])(.*?)\1[^>]*>/gi, (tag: string, _quote: string, href: string) => {
    const isStylesheet = /rel=(["'])[^"']*stylesheet[^"']*\1/i.test(tag);

    if (isStylesheet && isAllowedStylesheetSource(href)) {
      stylesheets.add(href);
    }

    return tag;
  });

  return [...stylesheets];
}

function extractAllowedScripts(html: string) {
  const scripts: string[] = [];

  html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (tag: string, attrs: string, code: string) => {
    const sourceMatch = attrs.match(/\bsrc=(["'])(.*?)\1/i);

    if (sourceMatch?.[2]) {
      const src = sourceMatch[2];

      if (isAllowedScriptSource(src)) {
        scripts.push(`<script src="${escapeAttribute(src)}"></script>`);
      }

      return tag;
    }

    const typeMatch = attrs.match(/\btype=(["'])(.*?)\1/i);
    const type = typeMatch?.[2]?.toLowerCase() ?? "";
    const isJavaScript = !type || type.includes("javascript") || type === "module";
    const trimmedCode = code.trim();

    if (isJavaScript && trimmedCode) {
      scripts.push(`<script>\n${trimmedCode.replace(/<\/script/gi, "<\\/script")}\n</script>`);
    }

    return tag;
  });

  return scripts;
}

function buildDemoScripts(html: string, css: string) {
  const scripts = extractAllowedScripts(html);
  const hasTailwindScript = scripts.some((script) => script.includes(TAILWIND_CDN_SCRIPT));

  if (needsTailwindRuntime(html, css) && !hasTailwindScript) {
    scripts.unshift(`<script src="${TAILWIND_CDN_SCRIPT}"></script>`);
  }

  return scripts;
}

function sanitizeDemoHtml(html: string) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<\/?(iframe|object|embed|base|meta)[^>]*>/gi, "")
    .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, "");
}

function sanitizeDemoCss(css: string) {
  return css
    .replace(/@import[^;]*;/gi, "")
    .replace(/url\((["']?)\s*javascript:[^)]+\)/gi, "url($1)")
    .replace(/\bexpression\s*\(/gi, "")
    .replace(/\bbehavior\s*:/gi, "");
}

function stripTrailingDemoNotes(html: string) {
  return html.replace(/\n\s*#{2,6}\s+\S[\s\S]*$/u, "").trim();
}

function buildDemoSrcDoc(demo: StyleDemo, title: string) {
  const demoHtml = stripTrailingDemoNotes(demo.html);
  const { html: htmlWithoutStyles, styles: inlineStyles } = extractInlineStyles(demoHtml);
  const safeBody = sanitizeDemoHtml(extractBodyInner(htmlWithoutStyles));
  const combinedCss = sanitizeDemoCss(`${inlineStyles}\n${demo.css}`);
  const isFullPageDemo = /\b[a-z0-9_-]*full-page[a-z0-9_-]*\b/i.test(safeBody);
  const rootClassName = isFullPageDemo ? "demo-root demo-root-full-page" : "demo-root";
  const fullPageScale = 0.25;
  const fullPageViewportWidth = Math.round(1200 * fullPageScale);
  const fullPageViewportHeight = Math.round(900 * fullPageScale);
  const demoMarkup = isFullPageDemo
    ? `<div class="demo-scale-viewport"><div class="demo-scale-stage">${safeBody}</div></div>`
    : safeBody;
  const stylesheets = extractAllowedStylesheets(demoHtml)
    .map((href) => `<link rel="stylesheet" href="${escapeAttribute(href)}" />`)
    .join("\n");
  const scripts = buildDemoScripts(demoHtml, demo.css).join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-src 'none'; img-src https: data: blob:; font-src https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; connect-src 'none';" />
<title>${escapeText(title)}</title>
${stylesheets}
<style>
${escapeStyleContent(combinedCss)}

  html,
  body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: transparent;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

	  .demo-root {
	    width: 100%;
	    height: 100%;
	    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px;
    overflow: hidden;
  }

	  .demo-root > * {
	    max-width: 100%;
	    max-height: 100%;
	  }

	  .demo-root-full-page {
	    position: relative;
	    display: block;
	    padding: 0;
	    background: #ffffff;
	  }

	  .demo-scale-viewport {
	    position: absolute;
	    top: 50%;
	    left: 50%;
	    width: ${fullPageViewportWidth}px;
	    height: ${fullPageViewportHeight}px;
	    overflow: hidden;
	    transform: translate(-50%, -50%);
	  }

	  .demo-scale-stage {
	    width: 1200px !important;
	    min-width: 1200px !important;
	    max-width: none !important;
	    height: 900px !important;
	    max-height: none !important;
	    overflow: hidden;
	    transform: scale(${fullPageScale});
	    transform-origin: top left;
	  }

	  .demo-scale-stage > * {
	    width: 1200px !important;
	    min-width: 1200px !important;
	    max-width: none !important;
	    min-height: 900px !important;
	  }

  #demoContainer,
  .demo-wrapper {
    font-size: clamp(7px, 3.2vmin, 16px);
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.001ms !important;
    }
  }
</style>
</head>
<body>
  <div class="${rootClassName}">${demoMarkup}</div>
  ${scripts}
</body>
</html>`;
}

function DemoPreviewFrame({
  demo,
  previewImageSrc,
  previewStyle,
  title
}: {
  demo: StyleDemo | null;
  previewImageSrc: string;
  previewStyle?: CSSProperties;
  title: string;
}) {
  const previewRef = useRef<HTMLSpanElement>(null);
  const [shouldMount, setShouldMount] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const srcDoc = useMemo(
    () => (imageFailed && shouldMount && demo ? buildDemoSrcDoc(demo, title) : null),
    [demo, imageFailed, shouldMount, title]
  );

  useEffect(() => {
    setImageFailed(false);
  }, [previewImageSrc]);

  useEffect(() => {
    if (shouldMount) {
      return;
    }

    const previewNode = previewRef.current;

    if (!previewNode) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setShouldMount(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin: "520px" }
    );

    observer.observe(previewNode);

    return () => {
      observer.disconnect();
    };
  }, [shouldMount]);

  if (!srcDoc) {
    if (!imageFailed) {
      return (
        <span ref={previewRef} className={styles.previewMount} style={previewStyle}>
          <img
            className={styles.familyPreviewImage}
            src={previewImageSrc}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        </span>
      );
    }

    return (
        <span ref={previewRef} className={styles.previewMount} style={previewStyle}>
          <span className={styles.demoFallback}>
          <span>{demo ? "预览加载中" : "暂无原始预览"}</span>
          </span>
        </span>
    );
  }

  return (
    <span ref={previewRef} className={styles.previewMount} style={previewStyle}>
      <iframe
        className={styles.familyPreviewFrame}
        title={`${title} original UI-Prompt preview`}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        tabIndex={-1}
      />
    </span>
  );
}

function getSearchText(family: StyleFamily) {
  return [
    family.id,
    family.familyId,
    family.category.id,
    family.category.name,
    family.name.zh,
    family.name.en,
    family.description.zh,
    family.description.en,
    family.tags.join(" "),
    ...family.templates.flatMap((template) => [
      template.id,
      template.title.zh,
      template.title.en,
      template.description.zh,
      template.description.en
    ])
  ]
    .join(" ")
    .toLowerCase();
}

export function StylePromptBrowser() {
  const [data, setData] = useState<StylePromptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [language, setLanguage] = useState<PromptLanguage>("zh-CN");
  const [promptKind, setPromptKind] = useState<PromptKind>("style");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [copyState, setCopyState] = useState(COPY_PROMPT_LABEL);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const response = await fetch(STYLE_PROMPT_DATA_URL);

        if (!response.ok) {
          throw new Error("无法载入风格提示词数据。");
        }

        const payload = (await response.json()) as StylePromptData;

        if (!active) {
          return;
        }

        startTransition(() => {
          setData(payload);
          setError(null);
        });
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "数据载入失败。");
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const previewReadyFamilies = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.families.filter((family) => !INVALID_PREVIEW_FAMILY_IDS.has(family.id));
  }, [data]);

  const distinctTemplatesByKind = useMemo(() => {
    const templateMaps: Record<PromptKind, Map<string, StyleTemplate[]>> = {
      style: new Map<string, StyleTemplate[]>(),
      custom: new Map<string, StyleTemplate[]>()
    };

    for (const family of previewReadyFamilies) {
      for (const kind of Object.keys(PROMPT_KIND_LABELS) as PromptKind[]) {
        templateMaps[kind].set(family.id, getDistinctTemplates(family, kind));
      }
    }

    return templateMaps;
  }, [previewReadyFamilies]);

  const activeDistinctTemplatesByFamilyId = distinctTemplatesByKind[promptKind];

  const totalDistinctTemplates = useMemo(
    () =>
      previewReadyFamilies.reduce(
        (total, family) => total + (activeDistinctTemplatesByFamilyId.get(family.id)?.length ?? 0),
        0
      ),
    [activeDistinctTemplatesByFamilyId, previewReadyFamilies]
  );

  const filteredFamilies = useMemo(() => {
    if (!data) {
      return [];
    }

    return previewReadyFamilies.filter((family) => {
      const matchesCategory = category === "all" || family.category.id === category;
      const matchesQuery = !deferredQuery || getSearchText(family).includes(deferredQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, data, deferredQuery, previewReadyFamilies]);

  useEffect(() => {
    if (selectedFamilyId && !filteredFamilies.some((family) => family.id === selectedFamilyId)) {
      setSelectedFamilyId(null);
      setSelectedTemplateId(null);
      setIsPromptModalOpen(false);
      setCopyState(COPY_PROMPT_LABEL);
    }
  }, [filteredFamilies, selectedFamilyId]);

  const selectedFamily = filteredFamilies.find((family) => family.id === selectedFamilyId) ?? null;
  const selectedFamilyTemplates = useMemo(() => {
    if (!selectedFamily) {
      return [];
    }

    return activeDistinctTemplatesByFamilyId.get(selectedFamily.id) ?? [];
  }, [activeDistinctTemplatesByFamilyId, selectedFamily]);

  const selectedTemplate =
    selectedFamilyTemplates.find((template) => template.id === selectedTemplateId) ?? null;

  const { promptContent, activeSource, isUsingFamilyPromptFallback } = getResolvedPromptState(
    selectedFamily,
    selectedTemplate,
    promptKind,
    language
  );
  const familyTitle = selectedFamily ? getLocalizedText(selectedFamily.name, language) : "风格提示词";
  const modalDescription = selectedFamily ? getLocalizedText(selectedFamily.description, language) : "";
  const selectedSceneTitle = selectedTemplate
    ? getLocalizedText(selectedTemplate.title, language)
    : language === "zh-CN"
      ? promptKind === "style"
        ? "基础风格提示词"
        : "基础自定义提示词"
      : promptKind === "style"
        ? "Base style prompt"
        : "Base custom prompt";
  const selectedSceneDescription = selectedTemplate
    ? getLocalizedText(selectedTemplate.description, language) ||
      (language === "zh-CN"
        ? "这个场景会切换到对应的提示词内容。"
        : "This scene switches the prompt content to its corresponding template.")
    : language === "zh-CN"
      ? promptKind === "style"
        ? "未选择具体场景时，这里展示当前风格家族的基础风格提示词。"
        : "未选择具体场景时，这里展示当前风格家族的基础自定义提示词。"
      : promptKind === "style"
        ? "When no scene is selected, the family base style prompt is shown here."
        : "When no scene is selected, the family base custom prompt is shown here.";
  const previewTitle = language === "zh-CN" ? "主示意图" : "Main preview";
  const previewDescription =
    selectedFamilyTemplates.length > 0
      ? language === "zh-CN"
        ? "当前数据只包含这个风格家族的主示意图。下方场景预设会切换当前提示词类型下的内容，但不会切换为独立截图。"
        : "The current dataset only includes the main preview for this family. Scene presets below switch the current prompt type content, not standalone screenshots."
      : language === "zh-CN"
        ? "当前展示的是这个风格家族的主示意图，并提供当前提示词类型下的基础内容。"
        : "This is the main preview for the selected family, alongside the base prompt for the current prompt type.";
  const scenePanelTitle = selectedTemplate
    ? selectedSceneTitle
    : language === "zh-CN"
      ? "选择一个场景"
      : "Choose a scene";
  const sceneRailDescription =
    selectedFamilyTemplates.length > 0
      ? language === "zh-CN"
        ? `这里只展示会切换到不同${PROMPT_KIND_LABELS[promptKind]}内容的场景预设。`
        : `Only scene presets that switch to different ${PROMPT_KIND_LABELS[promptKind].toLowerCase()} content are shown here.`
      : "";

  function handleSelectFamily(family: StyleFamily) {
    setSelectedFamilyId(family.id);
    setSelectedTemplateId(null);
    setCopyState(COPY_PROMPT_LABEL);
  }

  function handleOpenPromptModal(family: StyleFamily) {
    handleSelectFamily(family);
    setIsPromptModalOpen(true);
  }

  function handleClosePromptModal() {
    setIsPromptModalOpen(false);
    setCopyState(COPY_PROMPT_LABEL);
  }

  function handleSelectTemplate(templateId: string) {
    setSelectedTemplateId((current) => (current === templateId ? null : templateId));
    setCopyState(COPY_PROMPT_LABEL);
  }

  async function handleCopyPrompt() {
    if (!promptContent) {
      return;
    }

    await navigator.clipboard.writeText(promptContent);
    setCopyState(COPIED_LABEL);
    window.setTimeout(() => setCopyState(COPY_PROMPT_LABEL), 1500);
  }

  useEffect(() => {
    if (!isPromptModalOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPromptModalOpen(false);
        setCopyState(COPY_PROMPT_LABEL);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isPromptModalOpen]);

  useEffect(() => {
    if (!selectedTemplateId) {
      return;
    }

    if (selectedFamilyTemplates.some((template) => template.id === selectedTemplateId)) {
      return;
    }

    setSelectedTemplateId(null);
  }, [selectedFamilyTemplates, selectedTemplateId]);

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.ambientSecondary} aria-hidden="true" />

      <section className={styles.shell}>
        <div className={styles.topline}>
          <Link href="/tools" className={styles.backLink}>
            返回工具箱
          </Link>
          <Link href="/" className={styles.backLinkSecondary}>
            回到首页
          </Link>
        </div>

        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.kicker}>风格提示词库</p>
            <h1 className={styles.title}>常用风格提示词，一页查全。</h1>
            <p className={styles.description}>
              按分类浏览，搜索关键词，打开卡片查看预览，并直接复制中英文提示词。
            </p>
          </div>

          <div className={styles.sourceCard}>
            <span className={styles.sourceLabel}>数据来源</span>
            <span className={styles.sourceName}>UI-Prompt</span>
            <span className={styles.sourceMeta}>
              {data
                ? `${previewReadyFamilies.length} 个风格家族 / ${totalDistinctTemplates} 个${PROMPT_KIND_LABELS[promptKind]}场景`
                : "正在载入提示词数据"}
            </span>
            {data ? (
              <p className={styles.sourceNote}>当前快照导入于 {data.source.importedAt.slice(0, 10)}</p>
            ) : null}
            <div className={styles.sourceLinks}>
              <a href="https://www.uiprompt.site/zh/styles" target="_blank" rel="noreferrer">
                原站
              </a>
              <a href="https://github.com/TonnyWong1052/UI-Prompt" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>
          </div>
        </header>

        <section className={styles.workspace} aria-label="风格提示词浏览器">
          <div className={styles.catalog}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>索引</p>
                <h2 className={styles.panelTitle}>风格家族</h2>
              </div>
              <span className={styles.countBadge}>{filteredFamilies.length}</span>
            </div>

            <label className={styles.searchField}>
              <span className={styles.fieldLabel}>搜索</span>
              <input
                className={styles.searchInput}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入风格、标签或模板名..."
              />
            </label>

            {data ? (
              <div className={styles.categoryRail} aria-label="分类筛选">
                <button
                  type="button"
                  className={category === "all" ? styles.categoryButtonActive : styles.categoryButton}
                  onClick={() => setCategory("all")}
                >
                  {getCategoryLabel("all")}
                </button>
                {data.categories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      category === item.id ? styles.categoryButtonActive : styles.categoryButton
                    }
                    onClick={() => setCategory(item.id)}
                  >
                    {getCategoryLabel(item.id)}
                  </button>
                ))}
              </div>
            ) : null}

            <p className={styles.catalogHint}>
              打开任意卡片后，你可以切换语言、模板和提示词类型，再直接复制结果。
            </p>

            <div className={styles.familyList}>
              {error ? <p className={styles.errorText}>{error}</p> : null}
              {!data && !error ? <p className={styles.loadingText}>正在载入 UI-Prompt 数据...</p> : null}
              {data && filteredFamilies.length === 0 ? (
                <p className={styles.loadingText}>没有找到匹配的风格家族。</p>
              ) : null}

              {filteredFamilies.map((family) => (
                (() => {
                  const distinctTemplateCount =
                    activeDistinctTemplatesByFamilyId.get(family.id)?.length ?? 0;

                  return (
                    <article
                      key={family.id}
                      className={
                        isPromptModalOpen && selectedFamily?.id === family.id
                          ? styles.familyCardActive
                          : styles.familyCard
                      }
                      role="button"
                      tabIndex={0}
                      aria-haspopup="dialog"
                      aria-expanded={isPromptModalOpen && selectedFamily?.id === family.id}
                      onClick={() => handleOpenPromptModal(family)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleOpenPromptModal(family);
                        }
                      }}
                    >
                      <span className={styles.familyPreview} aria-hidden="true">
                        <DemoPreviewFrame
                          demo={family.demo}
                          previewImageSrc={`/images/style-prompt-previews/${family.id}.png?v=${STYLE_PROMPT_PREVIEW_VERSION}`}
                          previewStyle={getPreviewStyle(family.id)}
                          title={getLocalizedText(family.name, language)}
                        />
                      </span>
                      <span className={styles.familyCardBody}>
                        <span className={styles.familyMetaRow}>
                          <span className={styles.familyMeta}>{getCategoryLabel(family.category.id)}</span>
                          {distinctTemplateCount > 0 ? (
                            <span className={styles.familyTemplateCount}>
                              {distinctTemplateCount} 个场景
                            </span>
                          ) : null}
                        </span>
                        <span className={styles.familyTitle}>{getLocalizedText(family.name, language)}</span>
                        <span className={styles.familySubtitle}>{family.name.en}</span>
                        <span className={styles.familyDescription}>
                          {getLocalizedText(family.description, language)}
                        </span>
                        {family.tags.length > 0 ? (
                          <span className={styles.familyTagRow}>
                            {family.tags.slice(0, 3).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </span>
                        ) : null}
                        <span className={styles.familyAction}>
                          {distinctTemplateCount > 0 ? "打开提示词组合" : "打开基础提示词"}
                        </span>
                      </span>
                    </article>
                  );
                })()
              ))}
            </div>
          </div>
        </section>
      </section>

      {isPromptModalOpen && selectedFamily ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={handleClosePromptModal}>
          <section
            className={styles.promptModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="style-prompt-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.panelLabel}>{getCategoryLabel(selectedFamily.category.id)}</p>
                <h2 id="style-prompt-modal-title" className={styles.modalTitle}>
                  {familyTitle}
                </h2>
                <p className={styles.modalDescription}>{modalDescription}</p>
              </div>

              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={handleClosePromptModal}
                aria-label="关闭提示词弹框"
              >
                关闭
              </button>
            </div>

            <div className={styles.modalControls}>
              <div className={styles.toggleGroup} aria-label="提示词选项">
                {(Object.keys(LANGUAGE_LABELS) as PromptLanguage[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={language === item ? styles.toggleButtonActive : styles.toggleButton}
                    onClick={() => setLanguage(item)}
                  >
                    {LANGUAGE_LABELS[item]}
                  </button>
                ))}
                {(Object.keys(PROMPT_KIND_LABELS) as PromptKind[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={promptKind === item ? styles.toggleButtonActive : styles.toggleButton}
                    onClick={() => setPromptKind(item)}
                  >
                    {PROMPT_KIND_LABELS[item]}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={styles.copyButton}
                onClick={handleCopyPrompt}
                disabled={!promptContent}
              >
                {copyState}
              </button>
            </div>

            <div className={styles.modalStage}>
              <section className={styles.modalPreviewPanel} aria-label="当前风格示意图">
                <div className={styles.modalPanelIntro}>
                  <p className={styles.panelLabel}>{previewTitle}</p>
                  <h3 className={styles.modalSectionTitle}>{familyTitle}</h3>
                  <p className={styles.modalSectionDescription}>{previewDescription}</p>
                </div>

                <div className={styles.modalPreviewFrame}>
                  <DemoPreviewFrame
                    demo={selectedFamily.demo}
                    previewImageSrc={`/images/style-prompt-previews/${selectedFamily.id}.png?v=${STYLE_PROMPT_PREVIEW_VERSION}`}
                    previewStyle={getPreviewStyle(selectedFamily.id)}
                    title={familyTitle}
                  />
                </div>
              </section>

              {selectedFamilyTemplates.length > 0 ? (
                <section className={styles.modalScenePanel} aria-label="场景预设">
                  <div className={styles.modalPanelIntro}>
                    <p className={styles.panelLabel}>场景预设</p>
                    <h3 className={styles.modalSectionTitle}>{scenePanelTitle}</h3>
                    <p className={styles.modalSectionDescription}>{sceneRailDescription}</p>
                  </div>

                  <div className={styles.modalTemplateRail} aria-label="场景预设列表">
                    {selectedFamilyTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className={
                          selectedTemplate?.id === template.id
                            ? styles.templateButtonActive
                            : styles.templateButton
                        }
                        onClick={() => handleSelectTemplate(template.id)}
                      >
                        <span>{getLocalizedText(template.title, language)}</span>
                        <small>
                          {getLocalizedText(template.description, language) ||
                            (language === "zh-CN"
                              ? "切换到这个场景对应的提示词"
                              : "Switch to the prompt for this scene")}
                        </small>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <section className={styles.modalPromptPanel} aria-label="当前提示词">
              <div className={styles.modalPanelIntro}>
                <p className={styles.panelLabel}>提示词内容</p>
                <h3 className={styles.modalSectionTitle}>{selectedSceneTitle}</h3>
                <p className={styles.modalSectionDescription}>{selectedSceneDescription}</p>
                {isUsingFamilyPromptFallback ? (
                  <p className={styles.templateFallbackNote}>
                    {TEMPLATE_FALLBACK_NOTES[language]}
                  </p>
                ) : null}
              </div>

              <textarea className={styles.modalPromptTextarea} value={promptContent} readOnly />

              <div className={styles.promptFooter}>
                <span>{promptContent.length.toLocaleString()} 字符</span>
                {activeSource ? (
                  <a href={activeSource.prompt} target="_blank" rel="noreferrer">
                    查看来源数据
                  </a>
                ) : null}
              </div>
            </section>
          </section>
        </div>
      ) : null}
    </main>
  );
}
