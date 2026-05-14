import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_BASE_URL = "https://hex2077.dev/zh-cn/docs";

const SECTION_HEADING_PATTERN = /<h3\b[^>]*id="([^"]+)"[^>]*>[\s\S]*?<\/h3>/gi;

export function buildSourceUrl(date) {
  const month = date.slice(0, 7);
  return `${SOURCE_BASE_URL}/${month}/${date}/`;
}

export function parseSourceHtml(html, date) {
  const title = decodeHtml(readFirstMatch(html, /<title>([\s\S]*?)<\/title>/i))
    .replace(/\s+-\s+.*$/, "")
    .trim() || `AI Daily ${date}`;
  const summary = parseSummary(html);
  const sections = parseSections(html);

  if (summary.length === 0 && sections.length === 0) {
    throw new Error("No daily content found in source page");
  }

  return {
    date,
    title,
    summary,
    sections
  };
}

export function toMirrorFallbackEntry(parsed, date, updatedAt) {
  return {
    date,
    title: toSiteTitle(parsed.title, date),
    mode: "mirror_fallback",
    updatedAt,
    summary: parsed.summary.length > 0 ? parsed.summary : summarizeSections(parsed.sections),
    sections: parsed.sections
  };
}

export function entryForAiFailure({ existingEntry, parsed, date, updatedAt }) {
  if (existingEntry?.mode === "ai_summary") {
    return existingEntry;
  }

  return toMirrorFallbackEntry(parsed, date, updatedAt);
}

export function normalizeAiEntry(parsed, aiPayload, date, updatedAt) {
  const title = asCleanString(aiPayload.title) || toSiteTitle(parsed.title, date);
  const summary = normalizeStringArray(aiPayload.summary);
  const sections = normalizeSections(aiPayload.sections);

  if (summary.length === 0 || sections.length === 0) {
    throw new Error("AI response missing required summary or sections");
  }

  return {
    date,
    title,
    mode: "ai_summary",
    updatedAt,
    summary,
    sections
  };
}

export function extractJsonObject(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced ? fenced[1] : text;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }

  return JSON.parse(source.slice(start, end + 1));
}

export function buildArchiveEntry(entry) {
  return {
    date: entry.date,
    title: entry.title,
    mode: entry.mode,
    summary: entry.summary.slice(0, 3),
    updatedAt: entry.updatedAt,
    path: `/ai-daily/${entry.date}`
  };
}

export function upsertArchiveEntry(archive, archiveEntry) {
  const entries = [
    archiveEntry,
    ...archive.entries.filter((entry) => entry.date !== archiveEntry.date)
  ].sort((left, right) => right.date.localeCompare(left.date));

  return {
    latestDate: entries[0]?.date ?? null,
    entries
  };
}

export async function readArchive(archivePath) {
  try {
    const content = await readFile(archivePath, "utf8");
    return JSON.parse(content);
  } catch {
    return {
      latestDate: null,
      entries: []
    };
  }
}

export async function readEntry(entriesDir, date) {
  try {
    const content = await readFile(path.join(entriesDir, `${date}.json`), "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function writeEntryFiles({ archivePath, entriesDir, archive, entry }) {
  await mkdir(entriesDir, { recursive: true });
  await mkdir(path.dirname(archivePath), { recursive: true });
  await writeJson(path.join(entriesDir, `${entry.date}.json`), entry);
  await writeJson(archivePath, upsertArchiveEntry(archive, buildArchiveEntry(entry)));
}

export function sourceTextForModel(parsed) {
  const lines = [
    `日期：${parsed.date}`,
    `标题：${parsed.title}`,
    "",
    "今日摘要：",
    ...parsed.summary.map((item) => `- ${item}`),
    ""
  ];

  for (const section of parsed.sections) {
    lines.push(`## ${section.title}`);
    for (const item of section.items) {
      lines.push(`- ${item.title}：${item.body}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function parseSummary(html) {
  const summaryBlock = readFirstMatch(
    html,
    /<h2\b[^>]*id="今日摘要"[^>]*>[\s\S]*?<\/h2>\s*<pre\b[^>]*>[\s\S]*?<code\b[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/i
  );

  return decodeHtml(stripTags(summaryBlock))
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseSections(html) {
  const matches = [...html.matchAll(SECTION_HEADING_PATTERN)];
  const sections = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const title = decodeHtml(stripTags(match[1])).trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = findSectionEnd(html, start, next?.index ?? html.length);
    const body = html.slice(start, end);
    const items = parseListItems(body);

    if (title && items.length > 0) {
      sections.push({ title, items });
    }
  }

  return sections;
}

function findSectionEnd(html, start, fallbackEnd) {
  const boundaryMatches = [
    html.indexOf('<div id="toc"', start),
    html.indexOf("<footer", start),
    html.indexOf('aria-label="目录"', start)
  ].filter((index) => index !== -1 && index < fallbackEnd);

  return boundaryMatches.length > 0 ? Math.min(...boundaryMatches) : fallbackEnd;
}

function parseListItems(html) {
  const items = [];
  const itemMatches = html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi);

  for (const match of itemMatches) {
    const raw = match[1];
    const strong = readFirstMatch(raw, /<strong\b[^>]*>([\s\S]*?)<\/strong>/i);
    const text = cleanText(raw);
    const title = cleanTitle(strong ? cleanText(strong) : text.split(/[。.!！?？]/)[0] ?? "");
    const body = cleanBody(text, title);

    if ((title || body) && !isNavigationItem(title, body)) {
      items.push({
        title: title || "未命名条目",
        body: body || title
      });
    }
  }

  return items;
}

function isNavigationItem(title, body) {
  const text = `${title} ${body}`.trim();
  const normalized = text.toLowerCase();
  const navLabels = new Set([
    "今日摘要",
    "产品与功能更新",
    "前沿研究",
    "行业展望与社会影响",
    "开源top项目",
    "开源TOP项目",
    "社媒分享",
    "AI资讯日报多渠道",
    "回到顶部"
  ]);

  return (
    navLabels.has(title) ||
    navLabels.has(body) ||
    /^\/[a-z0-9-]+(?:\/)?$/i.test(normalized)
  );
}

function cleanBody(text, title) {
  const normalized = text.trim();
  if (!title || !normalized.startsWith(title)) {
    return normalized;
  }

  return normalized.slice(title.length).replace(/^[。.!！?？\s]+/, "").trim();
}

function cleanTitle(value) {
  return value.replace(/[。.!！?？]+$/, "").trim();
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(asCleanString).filter(Boolean);
}

function normalizeSections(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((section) => ({
      title: asCleanString(section?.title),
      items: Array.isArray(section?.items)
        ? section.items
          .map((item) => ({
            title: asCleanString(item?.title),
            body: asCleanString(item?.body)
          }))
          .filter((item) => item.title && item.body)
        : []
    }))
    .filter((section) => section.title && section.items.length > 0);
}

function summarizeSections(sections) {
  return sections
    .flatMap((section) => section.items.map((item) => `${item.title}：${item.body}`))
    .slice(0, 3);
}

function toSiteTitle(title, date) {
  if (/^AI Daily/i.test(title)) {
    return title;
  }

  const readable = date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, year, month, day) => {
    return `${year}/${Number(month)}/${Number(day)}`;
  });

  return `AI Daily ${readable}`;
}

function asCleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanText(html) {
  return decodeHtml(stripTags(removeSvg(html)))
    .replace(/\s+/g, " ")
    .trim();
}

function removeSvg(html) {
  return html.replace(/<svg\b[\s\S]*?<\/svg>/gi, "");
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, "");
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readFirstMatch(source, pattern) {
  return source.match(pattern)?.[1] ?? "";
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
