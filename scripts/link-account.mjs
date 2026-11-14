#!/usr/bin/env node
/**
 * 一次性账号绑定：只在终端里跑，没有任何网页界面。
 *
 *   ADMIN_TOKEN=xxx node scripts/link-account.mjs status
 *   ADMIN_TOKEN=xxx node scripts/link-account.mjs psn
 *   ADMIN_TOKEN=xxx node scripts/link-account.mjs nintendo
 *
 * 令牌是 social-api Worker 的 ADMIN_TOKEN，只在这一条命令的进程环境里，不落盘。
 */
import { createHash, randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";

const API_URL = process.env.SOCIAL_API_URL ?? "https://mays-social-api.mays.workers.dev";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";

const NINTENDO_SCOPES = [
  "openid",
  "user",
  "moonUser:administration",
  "moonDevice:create",
  "moonOwnedDevice:administration",
  "moonParentalControlSetting",
  "moonParentalControlSetting:update",
  "moonParentalControlSettingState",
  "moonPairingState",
  "moonSmartDevice:administration",
  "moonDailySummary",
  "moonMonthlySummary",
].join(" ");

const DIE = (message) => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

function adminFetch(path, init = {}) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      ...(init.headers ?? {}),
    },
  });
}

async function adminJson(path, init) {
  const response = await adminFetch(path, init);
  const text = await response.text();
  if (!response.ok) DIE(`${path} → HTTP ${response.status}${text ? `：${text.slice(0, 300)}` : ""}`);
  return text ? JSON.parse(text) : null;
}

async function showStatus() {
  const health = await adminJson("/health");
  for (const [platform, status] of Object.entries(health.platforms ?? {})) {
    console.log(
      `${platform.padEnd(9)} ${String(status.state).padEnd(13)} 最近成功：${status.lastSuccessAt ?? "—"}` +
        (status.lastError ? `\n          最近错误：${status.lastError}` : ""),
    );
  }
}

async function collect() {
  await adminJson("/api/collect", { method: "POST", body: "{}" });
  console.log("✔ 已触发首次采集（数据为空的账号要等下次登录主机后才有时长）");
}

function base64Url(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function linkWithNpsso(rl) {
  console.log(
    "\n1) 在已登录 PSN 的浏览器打开 https://ca.account.sony.com/api/v1/ssocookie\n" +
      "2) 页面会显示 {\"npsso\":\"…\"}，把那段 64 位值粘贴到下面\n",
  );
  const npsso = (await rl.question("NPSSO：")).trim();
  if (npsso.length < 32) DIE("NPSSO 看起来不对（长度不足）");
  await adminJson("/api/link/psn", { method: "POST", body: JSON.stringify({ npsso }) });
  console.log("✔ PSN 已绑定");
  await collect();
}

async function linkWithNintendo(rl) {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const state = base64Url(randomBytes(16));
  const params = new URLSearchParams({
    state,
    redirect_uri: "npf54789befb391a838://auth",
    client_id: "54789befb391a838",
    // znma（Switch 家长控制）客户端要的是 moon 系列 scope；
    // 用 NSO 客户端的 user.birthday/user.mii 会登录后被判「要求无效」。
    scope: NINTENDO_SCOPES,
    response_type: "session_token_code",
    session_token_code_challenge: challenge,
    session_token_code_challenge_method: "S256",
    theme: "login_form",
  });
  console.log(
    "\n1) 浏览器打开下面这个链接并登录任天堂账号：\n\n" +
      `   https://accounts.nintendo.com/connect/1.0.0/authorize?${params.toString()}\n\n` +
      "2) 登录成功后浏览器会跳到 npf54789befb391a838://auth#session_token_code=… 的失败页（正常现象）\n" +
      "3) 把地址栏整条 URL 复制粘贴到下面\n",
  );
  const pasted = (await rl.question("回调 URL：")).trim();
  const codeMatch = /session_token_code=([^&\s]+)/.exec(pasted);
  const stateMatch = /[?&#]state=([^&\s]+)/.exec(pasted);
  if (!codeMatch) DIE("没在粘贴内容里找到 session_token_code");
  if (!stateMatch || stateMatch[1] !== state) DIE("state 不匹配，请重新运行本命令");
  await adminJson("/api/link/nintendo", {
    method: "POST",
    body: JSON.stringify({
      sessionTokenCode: decodeURIComponent(codeMatch[1]),
      codeVerifier: verifier,
    }),
  });
  console.log("✔ 任天堂账号已绑定");
  await collect();
}

async function main() {
  const command = process.argv[2] ?? "status";
  if (!ADMIN_TOKEN) DIE("先设置环境变量 ADMIN_TOKEN（social-api 的密钥）");
  if (command === "status") {
    await showStatus();
    return;
  }
  if (command !== "psn" && command !== "nintendo") {
    DIE("用法：node scripts/link-account.mjs status|psn|nintendo");
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    if (command === "psn") await linkWithNpsso(rl);
    else await linkWithNintendo(rl);
  } finally {
    rl.close();
  }
  await showStatus();
}

main().catch((error) => DIE(error instanceof Error ? error.message : String(error)));
