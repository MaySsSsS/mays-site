import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildArchiveEntry,
  buildSourceUrl,
  entryForAiFailure,
  extractJsonObject,
  parseSourceHtml,
  toMirrorFallbackEntry,
  upsertArchiveEntry
} from "./ai-daily-core.mjs";

const aiDailyWorkflow = await readFile(new URL("../.github/workflows/ai-daily.yml", import.meta.url), "utf8");
const deployWorkflow = await readFile(new URL("../.github/workflows/deploy-frontend.yml", import.meta.url), "utf8");
const steamDataSource = await readFile(new URL("../lib/steam-data.ts", import.meta.url), "utf8");

const sourceHtml = `
<html>
  <head><title>AI资讯日报 2026/5/10</title></head>
  <body>
    <main>
      <h2 id="今日摘要">今日摘要</h2>
      <pre><code>第一条摘要
第二条摘要</code></pre>
      <h3 id="产品与功能更新">产品与功能更新</h3>
      <ol>
        <li><p><strong>产品 A 更新。</strong> 支持新的交互能力。</p></li>
        <li><p><strong>产品 B 发布。</strong> 提供更快的推理。</p></li>
      </ol>
      <h3 id="前沿研究">前沿研究</h3>
      <ol>
        <li><p><strong>研究 C。</strong> 改善幻觉检测。</p></li>
      </ol>
    </main>
  </body>
</html>`;

test("buildSourceUrl derives the Hex daily URL from a date", () => {
  assert.equal(
    buildSourceUrl("2026-05-10"),
    "https://hex2077.dev/zh-cn/docs/2026-05/2026-05-10/"
  );
});

test("AI Daily workflow pulls data at 12:00 Asia/Shanghai", () => {
  assert.match(aiDailyWorkflow, /cron:\s*"0 4 \* \* \*"/);
  assert.doesNotMatch(aiDailyWorkflow, /cron:\s*"0 3 \* \* \*"/);
  assert.doesNotMatch(aiDailyWorkflow, /cron:\s*"30 1 \* \* \*"/);
});

test("AI Daily workflow deploys the frontend after data changes", () => {
  assert.match(aiDailyWorkflow, /id:\s*commit-data/);
  assert.match(aiDailyWorkflow, /echo "changed=true" >> "\$GITHUB_OUTPUT"/);
  assert.match(aiDailyWorkflow, /if:\s*steps\.commit-data\.outputs\.changed == 'true'/);
  assert.match(aiDailyWorkflow, /Deploy updated frontend to Cloudflare Workers/);
  assert.match(aiDailyWorkflow, /NEXT_PUBLIC_AI_DAILY_PASSWORD_HASH:\s*\$\{\{\s*vars\.NEXT_PUBLIC_AI_DAILY_PASSWORD_HASH\s*\}\}/);
  assert.match(aiDailyWorkflow, /STEAM_DATA_SOURCE:\s*static/);
});

test("frontend deployment injects AI Daily password hash at build time", () => {
  assert.match(
    deployWorkflow,
    /NEXT_PUBLIC_AI_DAILY_PASSWORD_HASH:\s*\$\{\{\s*vars\.NEXT_PUBLIC_AI_DAILY_PASSWORD_HASH\s*\}\}/
  );
});

test("frontend deployment builds game pages from the static Steam snapshot", () => {
  assert.match(deployWorkflow, /STEAM_DATA_SOURCE:\s*static/);
  assert.match(steamDataSource, /process\.env\.STEAM_DATA_SOURCE === "static"/);
});

test("parseSourceHtml extracts title, summary, and structured sections", () => {
  const parsed = parseSourceHtml(sourceHtml, "2026-05-10");

  assert.equal(parsed.title, "AI资讯日报 2026/5/10");
  assert.deepEqual(parsed.summary, ["第一条摘要", "第二条摘要"]);
  assert.equal(parsed.sections.length, 2);
  assert.equal(parsed.sections[0].title, "产品与功能更新");
  assert.equal(parsed.sections[0].items[0].title, "产品 A 更新");
  assert.equal(parsed.sections[0].items[0].body, "支持新的交互能力。");
});

test("parseSourceHtml stops the last section before page footer navigation", () => {
  const parsed = parseSourceHtml(
    `
    <html>
      <head><title>AI资讯日报 2026/5/10</title></head>
      <body>
        <h2 id="今日摘要">今日摘要</h2>
        <pre><code>摘要</code></pre>
        <h3 id="社媒分享">社媒分享</h3>
        <ol>
          <li><p><strong>真实社媒条目。</strong> 这是正文。</p></li>
        </ol>
        <div id="toc">
          <ol>
            <li><a href="#今日摘要">今日摘要</a></li>
            <li><a href="/rss">/rss</a></li>
          </ol>
        </div>
      </body>
    </html>`,
    "2026-05-10"
  );

  assert.equal(parsed.sections.length, 1);
  assert.equal(parsed.sections[0].items.length, 1);
  assert.equal(parsed.sections[0].items[0].title, "真实社媒条目");
});

test("parseSourceHtml filters table-of-contents and route-only list items", () => {
  const parsed = parseSourceHtml(
    `
    <html>
      <head><title>AI资讯日报 2026/5/10</title></head>
      <body>
        <h2 id="今日摘要">今日摘要</h2>
        <pre><code>摘要</code></pre>
        <h3 id="社媒分享">社媒分享</h3>
        <ol>
          <li><p><strong>真实社媒条目。</strong> 这是正文。</p></li>
          <li><p><a href="#今日摘要">今日摘要</a></p></li>
          <li><p><a href="#社媒分享">社媒分享</a></p></li>
          <li><p><a href="/rss">/rss</a></p></li>
          <li><p><strong>回到顶部</strong></p></li>
        </ol>
      </body>
    </html>`,
    "2026-05-10"
  );

  assert.deepEqual(
    parsed.sections[0].items.map((item) => item.title),
    ["真实社媒条目"]
  );
});

test("toMirrorFallbackEntry creates a renderable fallback entry", () => {
  const parsed = parseSourceHtml(sourceHtml, "2026-05-10");
  const entry = toMirrorFallbackEntry(parsed, "2026-05-10", "2026-05-10T01:30:00.000Z");

  assert.equal(entry.mode, "mirror_fallback");
  assert.equal(entry.date, "2026-05-10");
  assert.equal(entry.sections[0].items[1].title, "产品 B 发布");
});

test("entryForAiFailure preserves an existing AI summary instead of downgrading it", () => {
  const parsed = parseSourceHtml(sourceHtml, "2026-05-10");
  const existingEntry = {
    date: "2026-05-10",
    title: "AI资讯日报 2026/5/10",
    mode: "ai_summary",
    updatedAt: "2026-05-10T01:30:00.000Z",
    summary: ["保留这条 AI 摘要"],
    sections: [
      {
        title: "已有分组",
        items: [{ title: "已有条目", body: "已有正文" }]
      }
    ]
  };
  const entry = entryForAiFailure({
    existingEntry,
    parsed,
    date: "2026-05-10",
    updatedAt: "2026-05-10T02:30:00.000Z"
  });

  assert.equal(entry, existingEntry);
  assert.equal(entry.mode, "ai_summary");
  assert.equal(entry.updatedAt, "2026-05-10T01:30:00.000Z");
});

test("extractJsonObject reads JSON even when the model wraps it in text", () => {
  const result = extractJsonObject('前言 {"title":"日报","summary":["a"],"sections":[]} 结束');

  assert.deepEqual(result, {
    title: "日报",
    summary: ["a"],
    sections: []
  });
});

test("buildArchiveEntry and upsertArchiveEntry keep newest dates first", () => {
  const parsed = parseSourceHtml(sourceHtml, "2026-05-10");
  const entry = toMirrorFallbackEntry(parsed, "2026-05-10", "2026-05-10T01:30:00.000Z");
  const archiveEntry = buildArchiveEntry(entry);
  const archive = upsertArchiveEntry(
    {
      latestDate: "2026-05-09",
      entries: [
        {
          date: "2026-05-09",
          title: "Old",
          mode: "ai_summary",
          summary: ["old"],
          updatedAt: "2026-05-09T01:30:00.000Z",
          path: "/ai-daily/2026-05-09"
        }
      ]
    },
    archiveEntry
  );

  assert.equal(archive.latestDate, "2026-05-10");
  assert.deepEqual(
    archive.entries.map((item) => item.date),
    ["2026-05-10", "2026-05-09"]
  );
});
