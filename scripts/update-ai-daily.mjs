#!/usr/bin/env node

import path from "node:path";
import process from "node:process";

import {
  buildSourceUrl,
  entryForAiFailure,
  extractJsonObject,
  normalizeAiEntry,
  parseSourceHtml,
  readArchive,
  readEntry,
  sourceTextForModel,
  writeEntryFiles
} from "./ai-daily-core.mjs";

const DEFAULT_ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/coding/paas/v4";
const DEFAULT_ZHIPU_MODEL = "GLM-5.1";
const ROOT_DIR = process.cwd();
const ARCHIVE_PATH = path.join(ROOT_DIR, "public/data/ai-daily/index.json");
const ENTRIES_DIR = path.join(ROOT_DIR, "public/data/ai-daily/entries");

async function main() {
  const date = readDateArgument(process.argv.slice(2)) ?? getShanghaiDate();
  const sourceUrl = buildSourceUrl(date);

  console.log(`[ai-daily] checking ${date} at ${sourceUrl}`);

  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "mays-site-ai-daily/1.0"
    }
  });

  if (!response.ok) {
    console.log(`[ai-daily] source unavailable: ${response.status}`);
    return;
  }

  const html = await response.text();
  const parsed = parseSourceHtml(html, date);
  const updatedAt = new Date().toISOString();
  const archive = await readArchive(ARCHIVE_PATH);
  const existingEntry = await readEntry(ENTRIES_DIR, date);
  const entry = await createEntry(parsed, date, updatedAt, existingEntry);

  await writeEntryFiles({
    archivePath: ARCHIVE_PATH,
    entriesDir: ENTRIES_DIR,
    archive,
    entry
  });

  console.log(`[ai-daily] wrote ${date} in ${entry.mode} mode`);
}

async function createEntry(parsed, date, updatedAt, existingEntry) {
  try {
    const aiPayload = await generateAiPayload(parsed);
    return normalizeAiEntry(parsed, aiPayload, date, updatedAt);
  } catch (error) {
    console.log(`[ai-daily] AI unavailable, using fallback: ${toSafeReason(error)}`);
    const entry = entryForAiFailure({ existingEntry, parsed, date, updatedAt });
    if (entry === existingEntry) {
      console.log(`[ai-daily] preserving existing AI summary for ${date}`);
    }
    return entry;
  }
}

async function generateAiPayload(parsed) {
  const apiKey = process.env.ZHIPU_API_KEY;

  if (!apiKey) {
    throw new Error("ZHIPU_API_KEY is not configured");
  }

  const baseUrl = trimTrailingSlash(process.env.ZHIPU_BASE_URL || DEFAULT_ZHIPU_BASE_URL);
  const model = process.env.ZHIPU_MODEL || DEFAULT_ZHIPU_MODEL;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是一个中文 AI 日报编辑。只基于用户提供的内容整理，不添加外部事实。必须返回合法 JSON。"
        },
        {
          role: "user",
          content: buildPrompt(parsed)
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`Zhipu request failed with ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Zhipu response did not include message content");
  }

  return extractJsonObject(content);
}

function buildPrompt(parsed) {
  return [
    "请把以下 AI 日报来源内容整理成本站 AI Daily 的 JSON。",
    "要求：",
    "1. 输出中文。",
    "2. 结构接近原始日报：今日摘要、产品与功能更新、前沿研究、行业影响、开源项目、社媒分享等。",
    "3. 不要编造来源内容之外的新闻。",
    "4. 不要输出 Markdown，不要输出解释，只输出 JSON 对象。",
    "5. JSON schema: {\"title\":\"string\",\"summary\":[\"string\"],\"sections\":[{\"title\":\"string\",\"items\":[{\"title\":\"string\",\"body\":\"string\"}]}]}",
    "",
    sourceTextForModel(parsed)
  ].join("\n");
}

function readDateArgument(args) {
  const dateFlagIndex = args.indexOf("--date");

  if (dateFlagIndex === -1) {
    return null;
  }

  const date = args[dateFlagIndex + 1];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
    throw new Error("--date must be formatted as YYYY-MM-DD");
  }

  return date;
}

function getShanghaiDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(new Date());
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function toSafeReason(error) {
  return error instanceof Error ? error.message : "unknown error";
}

main().catch((error) => {
  console.error(`[ai-daily] failed: ${toSafeReason(error)}`);
  process.exitCode = 1;
});
