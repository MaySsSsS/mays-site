#!/usr/bin/env node
/**
 * 部署前检查：把「先提交，再发布」变成可执行的门禁。
 *
 * 用法：
 *   node scripts/predeploy-check.mjs            # 部署前（即将完整构建）
 *   node scripts/predeploy-check.mjs --skip-build  # 复用已有 .open-next 构建产物
 *
 * 环境变量：
 *   ALLOW_DIRTY_DEPLOY=1  允许发布未提交的工作区（默认拦截）
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const skipBuild = process.argv.includes("--skip-build");

function run(command, args) {
  return execFileSync(command, args, { cwd: root, encoding: "utf8" }).trim();
}

function git(args) {
  try {
    return run("git", args);
  } catch {
    return "";
  }
}

function readJson(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readWorkerName() {
  const configPath = path.join(root, "wrangler.jsonc");
  if (!fs.existsSync(configPath)) return "(unknown)";
  const match = fs.readFileSync(configPath, "utf8").match(/"name"\s*:\s*"([^"]+)"/);
  return match ? match[1] : "(unknown)";
}

const workerName = readWorkerName();
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]) || "(detached)";
const commit = git(["log", "-1", "--format=%h %s"]) || "(no commit)";
const nextVersion = readJson("node_modules/next/package.json")?.version ?? "(unknown)";
const wranglerVersion = readJson("node_modules/wrangler/package.json")?.version ?? "(unknown)";
const openNextVersion =
  readJson("node_modules/@opennextjs/cloudflare/package.json")?.version ?? "(unknown)";
const dataSource =
  process.env.STEAM_DATA_SOURCE === "static"
    ? "static（使用打包内的 JSON 快照）"
    : "api（构建时请求 game-api，失败会回退快照）";

console.log(`[predeploy] 目标 Worker: ${workerName}`);
console.log(`[predeploy] 分支: ${branch}`);
console.log(`[predeploy] 提交: ${commit}`);
console.log(`[predeploy] 版本: next ${nextVersion} / wrangler ${wranglerVersion} / opennext ${openNextVersion}`);
console.log(`[predeploy] Steam 数据源: ${dataSource}`);

if (skipBuild) {
  if (!fs.existsSync(path.join(root, ".open-next", "worker.js"))) {
    console.error("[predeploy] 缺少 .open-next/worker.js，请先运行 pnpm build:cf 再执行 deploy:only。");
    process.exit(1);
  }
  console.log("[predeploy] 复用已有 .open-next 构建产物（不重新构建）");
}

const dirtyFiles = git(["status", "--porcelain"])
  .split("\n")
  .filter(Boolean);

if (dirtyFiles.length > 0) {
  const allowDirty = process.env.ALLOW_DIRTY_DEPLOY === "1";
  const message = `工作区有 ${dirtyFiles.length} 个未提交改动`;
  if (!allowDirty) {
    console.error(`[predeploy] ${message}，已阻止部署：`);
    for (const line of dirtyFiles.slice(0, 10)) console.error(`  ${line}`);
    if (dirtyFiles.length > 10) console.error(`  ...还有 ${dirtyFiles.length - 10} 个`);
    console.error("[predeploy] 先提交改动再发布；确需发布当前工作区：ALLOW_DIRTY_DEPLOY=1 pnpm deploy");
    process.exit(1);
  }
  console.warn(`[predeploy] ${message}，已通过 ALLOW_DIRTY_DEPLOY=1 放行：`);
  for (const line of dirtyFiles.slice(0, 10)) console.warn(`  ${line}`);
}

if (branch !== "main") {
  console.warn("[predeploy] 当前分支不是 main：GitHub Actions 只在 main 上自动部署，本次属于手动发布。");
}

console.log("[predeploy] 检查通过");