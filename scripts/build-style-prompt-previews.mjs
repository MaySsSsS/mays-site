import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const chromeBinary = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const debugPort = 9444;
const previewSize = 560;
const navDelayMs = 1600;

const dataPath = path.resolve("public/data/ui-prompt-styles.json");
const outputDir = path.resolve("public/images/style-prompt-previews");

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

const TAILWIND_CDN_SCRIPT = "https://cdn.tailwindcss.com";
const TAILWIND_CLASS_PATTERN =
  /^(?:-)?(?:absolute|backdrop-|bg-|blur|border|bottom-|cursor-|duration-|flex|font-|from-|gap-|grid|group|h-|hover:|inset-|items-|justify-|left-|m[blrtxy]?-|max-w-|mb-|min-h-|opacity-|overflow-|p[blrtxy]?-|relative|right-|rotate-|rounded|scale-|shadow|space-|text-|to-|top-|transform|transition|via-|w-|z-)/;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeStyleContent(value) {
  return value.replace(/<\/style/gi, "<\\/style");
}

function isAllowedScriptSource(src) {
  return ALLOWED_SCRIPT_SOURCES.some((pattern) => pattern.test(src));
}

function isAllowedStylesheetSource(href) {
  return ALLOWED_STYLESHEET_SOURCES.some((pattern) => pattern.test(href));
}

function hasInlineStyles(html) {
  return /<style[\s>]/i.test(html);
}

function hasTailwindUtilityClasses(html) {
  const classMatches = html.matchAll(/\bclass=(["'])([^"']*)\1/gi);

  for (const match of classMatches) {
    const classes = match[2].split(/\s+/).filter(Boolean);

    if (classes.some((className) => TAILWIND_CLASS_PATTERN.test(className))) {
      return true;
    }
  }

  return false;
}

function needsTailwindRuntime(html, css) {
  return !css.trim() && !hasInlineStyles(html) && hasTailwindUtilityClasses(html);
}

function extractBodyInner(html) {
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

function extractInlineStyles(html) {
  const styles = [];
  const htmlWithoutStyles = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    styles.push(css || "");
    return "";
  });

  return {
    html: htmlWithoutStyles,
    styles: styles.join("\n")
  };
}

function extractAllowedStylesheets(html) {
  const stylesheets = new Set(DEFAULT_STYLESHEETS);

  html.replace(/<link\b[^>]*href=(["'])(.*?)\1[^>]*>/gi, (tag, _quote, href) => {
    const isStylesheet = /rel=(["'])[^"']*stylesheet[^"']*\1/i.test(tag);

    if (isStylesheet && isAllowedStylesheetSource(href)) {
      stylesheets.add(href);
    }

    return tag;
  });

  return [...stylesheets];
}

function extractAllowedScripts(html) {
  const scripts = [];

  html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (tag, attrs, code) => {
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

function buildDemoScripts(html, css) {
  const scripts = extractAllowedScripts(html);
  const hasTailwindScript = scripts.some((script) => script.includes(TAILWIND_CDN_SCRIPT));

  if (needsTailwindRuntime(html, css) && !hasTailwindScript) {
    scripts.unshift(`<script src="${TAILWIND_CDN_SCRIPT}"></script>`);
  }

  return scripts;
}

function sanitizeDemoHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<\/?(iframe|object|embed|base|meta)[^>]*>/gi, "")
    .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, "");
}

function sanitizeDemoCss(css) {
  return css
    .replace(/@import[^;]*;/gi, "")
    .replace(/url\((["']?)\s*javascript:[^)]+\)/gi, "url($1)")
    .replace(/\bexpression\s*\(/gi, "")
    .replace(/\bbehavior\s*:/gi, "");
}

function stripTrailingDemoNotes(html) {
  return html.replace(/\n\s*#{2,6}\s+\S[\s\S]*$/u, "").trim();
}

function buildDemoDocument(demo, title) {
  const demoHtml = stripTrailingDemoNotes(demo.html);
  const { html: htmlWithoutStyles, styles: inlineStyles } = extractInlineStyles(demoHtml);
  const safeBody = sanitizeDemoHtml(extractBodyInner(htmlWithoutStyles));
  const combinedCss = sanitizeDemoCss(`${inlineStyles}\n${demo.css}`);
  const isFullPageDemo = /\b[a-z0-9_-]*full-page[a-z0-9_-]*\b/i.test(safeBody);
  const fullPageScale = 0.45;
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
  background: #f4f7fb;
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
  padding: 16px;
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
  <div class="${isFullPageDemo ? "demo-root demo-root-full-page" : "demo-root"}">${demoMarkup}</div>
  ${scripts}
</body>
</html>`;
}

async function waitForEndpoint(url, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response.json();
      }
    } catch {}

    await delay(250);
  }

  throw new Error(`Unable to connect to Chrome DevTools endpoint: ${url}`);
}

async function startChrome(tempProfileDir) {
  const chrome = spawn(
    chromeBinary,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      `--user-data-dir=${tempProfileDir}`,
      `--remote-debugging-port=${debugPort}`,
      `--window-size=${previewSize},${previewSize}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );

  await waitForEndpoint(`http://127.0.0.1:${debugPort}/json/version`);
  const pages = await waitForEndpoint(`http://127.0.0.1:${debugPort}/json/list`);
  const page = pages.find((item) => item.type === "page") ?? pages[0];
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  let callId = 0;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  function send(method, params = {}) {
    const id = ++callId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) => pending.set(id, resolve));
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: previewSize,
    height: previewSize,
    deviceScaleFactor: 1,
    mobile: false
  });

  return { chrome, socket, send };
}

async function capturePreviews() {
  const raw = fs.readFileSync(dataPath, "utf8");
  const data = JSON.parse(raw);
  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "style-prompt-preview-profile-"));
  const tempHtmlDir = fs.mkdtempSync(path.join(os.tmpdir(), "style-prompt-preview-html-"));

  fs.mkdirSync(outputDir, { recursive: true });

  const { chrome, socket, send } = await startChrome(tempProfileDir);

  try {
    for (const family of data.families) {
      const title = family.name?.en || family.id;
      const html = buildDemoDocument(family.demo, title);
      const htmlPath = path.join(tempHtmlDir, `${family.id}.html`);
      const imagePath = path.join(outputDir, `${family.id}.png`);

      fs.writeFileSync(htmlPath, html);
      await send("Page.navigate", { url: `file://${htmlPath}` });
      await delay(navDelayMs);

      await send("Runtime.evaluate", {
        expression: "document.fonts ? document.fonts.ready.then(() => true) : true",
        awaitPromise: true,
        returnByValue: true
      });

      await delay(300);

      const screenshot = await send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false
      });

      fs.writeFileSync(imagePath, Buffer.from(screenshot.result.data, "base64"));
      console.log(`rendered ${family.id}`);
    }
  } finally {
    socket.close();
    chrome.kill("SIGTERM");
  }
}

capturePreviews().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
