import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("social-api 用 D1 存加密凭证与快照", () => {
  const index = read("workers/social-api/src/index.ts");
  const schema = read("workers/social-api/schema.sql");
  const toml = read("workers/social-api/wrangler.toml");

  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS credentials"), "缺少 credentials 表");
  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS snapshots"), "缺少 snapshots 表");
  assert.match(schema, /ciphertext TEXT NOT NULL/);
  assert.ok(toml.includes('binding = "SOCIAL_DB"'), "wrangler.toml 缺少 D1 绑定");
  assert.match(index, /readSnapshot\(env\.SOCIAL_DB/, "快照要从 D1 读");
});

test("管理接口必须校验 ADMIN_TOKEN", () => {
  const index = read("workers/social-api/src/index.ts");
  assert.ok(index.includes("Bearer ${token}"), "缺少 Bearer 校验");
  const linkBlocks = index.split("isAdmin(env, request)").length - 1;
  assert.ok(linkBlocks >= 3, "写接口（link/collect/delete）都要鉴权");
});

test("凭证只以密文入库，使用 AES-GCM", () => {
  const crypto = read("workers/social-api/src/crypto.ts");
  const collect = read("workers/social-api/src/collect.ts");
  assert.ok(crypto.includes('"AES-GCM"'), "需要用 AES-GCM");
  assert.ok(crypto.includes("crypto.getRandomValues"), "每次加密要有随机 IV");
  assert.ok(collect.includes("encryptJson"), "入库前必须加密");
  assert.match(collect, /writeCredential\(env\.SOCIAL_DB, "nintendo", payload\.ciphertext/, "任天堂凭证入库必须用密文");
  assert.match(collect, /writeCredential\(env\.SOCIAL_DB, "psn", payload\.ciphertext/, "PSN 凭证入库必须用密文");
});

test("PSN 时长取自 playDuration，任天堂取自 moon 每日汇总", () => {
  const psn = read("workers/social-api/src/psn.ts");
  const nintendo = read("workers/social-api/src/nintendo.ts");
  const parse = read("workers/social-api/src/parse.ts");
  assert.ok(psn.includes("gamelist/v2/users/me/titles"), "PSN 游戏列表端点");
  assert.ok(psn.includes("playDuration"), "PSN 用 playDuration 算时长");
  assert.ok(nintendo.includes("/daily_summaries"), "任天堂用每日汇总");
  assert.ok(parse.includes("devicePlayers"), "任天堂按玩家维度汇总时长");
  assert.ok(parse.includes("applicationId"), "按 applicationId 聚合");
});

test("采集失败保留旧快照，只改状态", () => {
  const collect = read("workers/social-api/src/collect.ts");
  assert.ok(collect.includes("needs_relogin"), "要区分 needs_relogin");
  assert.ok(collect.includes("retryable"), "网络/限流不该要求重新登录");
  assert.ok(!/catch[\s\S]{0,300}writeSnapshot\(env\.SOCIAL_DB, \{\s*\.\.\./.test(collect), "失败时不能写入空快照");
});

test("PSN 资料按 JWT 里的 account_id 取，不用 /users/me", () => {
  const psn = read("workers/social-api/src/psn.ts");
  assert.ok(psn.includes("account_id"), "从 access_token 里解 account_id");
  assert.ok(psn.includes("/userProfile/v1/internal/users/${accountId}/profiles"), "资料路径必须带 accountId");
  assert.ok(!psn.includes('internal/users/me/profiles"'), "不要再请求 /users/me/profiles（会 400）");
});

test("表结构自愈创建，不依赖外部迁移步骤", () => {
  const schema = read("workers/social-api/src/schema.ts");
  const index = read("workers/social-api/src/index.ts");
  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS snapshots"));
  assert.ok(schema.includes("ready = null"), "建表失败要能重试");
  assert.match(index, /await ensureSchema\(env\.SOCIAL_DB\)/, "请求入口要先建表");
});

test("定时采集已配置 cron", () => {
  const toml = read("workers/social-api/wrangler.toml");
  assert.match(toml, /\[triggers\][\s\S]*crons = \[/);
});

test("绑定走本地 CLI，站点里没有绑定页", () => {
  assert.equal(existsSync(new URL("../app/games/link", import.meta.url)), false, "不能有 /games/link 页面");
  const script = read("scripts/link-account.mjs");
  assert.ok(script.includes("session_token_code_challenge_method"), "任天堂要走 PKCE");
  assert.ok(script.includes('"S256"'), "PKCE 用 S256");
  assert.ok(script.includes("moonDailySummary"), "znma 客户端要 moon 系列 scope，不是 NSO 的 user.mii");
  assert.ok(script.includes("npf54789befb391a838://auth"), "回调必须是 znma 客户端的 scheme");
  assert.match(script, /stateMatch\[1\] !== state/, "回调必须校验 state");
  assert.ok(script.includes("process.env.ADMIN_TOKEN"), "令牌只从环境变量读");
  assert.ok(!script.includes("ghp_"), "脚本里不能写死任何真实令牌");
  assert.ok(!read("lib/social-api.ts").includes("/api/link/"), "前端只保留只读接口");
});
