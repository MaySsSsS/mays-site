import { collect, collectAll, linkNintendo, linkPsn, PLATFORMS, unlink, zncaConfig } from "./collect.js";
import { readCredential, readSnapshot, readStatus } from "./db.js";
import { nintendoDiagnostics, nintendoExchangeSessionToken } from "./nintendo.js";
import { decryptJson } from "./crypto.js";
import { ensureSchema } from "./schema.js";
import type { Env, Platform, PlatformStatus } from "./types.js";

const DEFAULT_ORIGINS = ["https://linkmays.com", "http://localhost:3000"];

function allowedOrigins(env: Env): string[] {
  const configured = (env.CORS_ORIGIN ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set([...configured, ...DEFAULT_ORIGINS])];
}

function corsHeaders(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = allowedOrigins(env);
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(env: Env, request: Request, body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(env, request),
      ...(init.headers ?? {}),
    },
  });
}

function isAdmin(env: Env, request: Request): boolean {
  const token = env.ADMIN_TOKEN;
  if (!token) return false;
  return request.headers.get("Authorization") === `Bearer ${token}`;
}

function asPlatform(value: string | undefined): Platform | null {
  return value === "psn" || value === "nintendo" ? value : null;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = (await request.json()) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function publicStatus(status: PlatformStatus | null, includeError: boolean): unknown {
  if (!status) return { state: "unlinked", lastSuccessAt: null };
  return {
    state: status.state,
    lastSuccessAt: status.lastSuccessAt,
    ...(includeError ? { lastAttemptAt: status.lastAttemptAt, lastError: status.lastError } : {}),
  };
}

async function handleHealth(env: Env, request: Request): Promise<Response> {
  const admin = isAdmin(env, request);
  const entries = await Promise.all(
    PLATFORMS.map(async (platform) => [platform, publicStatus(await readStatus(env.SOCIAL_DB, platform), admin)] as const),
  );
  return json(env, request, {
    ok: true,
    platforms: Object.fromEntries(entries),
  });
}

async function handleSnapshot(env: Env, request: Request, platform: Platform): Promise<Response> {
  const snapshot = await readSnapshot(env.SOCIAL_DB, platform);
  if (!snapshot) {
    return json(env, request, { error: "尚未采集", state: "unlinked" }, { status: 404 });
  }
  return json(env, request, snapshot, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}

async function handleLink(env: Env, request: Request, platform: Platform): Promise<Response> {
  const body = await readBody(request);
  if (platform === "psn") {
    const npsso = body.npsso;
    if (typeof npsso !== "string" || npsso.trim().length < 32) {
      return json(env, request, { error: "缺少 npsso" }, { status: 400 });
    }
    const status = await linkPsn(env, npsso);
    return json(env, request, { ok: status.state === "ok", status });
  }
  // 登录页交回的是 session_token_code + PKCE verifier；直接给 sessionToken 也支持（便于手工导入）
  let sessionToken = typeof body.sessionToken === "string" ? body.sessionToken.trim() : "";
  if (!sessionToken) {
    const code = typeof body.sessionTokenCode === "string" ? body.sessionTokenCode : "";
    const verifier = typeof body.codeVerifier === "string" ? body.codeVerifier : "";
    if (code.length < 8 || verifier.length < 32) {
      return json(env, request, { error: "缺少 sessionToken 或 sessionTokenCode + codeVerifier" }, { status: 400 });
    }
    try {
      sessionToken = await nintendoExchangeSessionToken(code, verifier);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return json(env, request, { error: message }, { status: 400 });
    }
  }
  const status = await linkNintendo(env, sessionToken);
  return json(env, request, { ok: status.state === "ok", status });
}

async function handleNintendoDebug(env: Env, request: Request): Promise<Response> {
  const credential = await readCredential(env.SOCIAL_DB, "nintendo");
  if (!credential) return json(env, request, { error: "任天堂还没绑定" }, { status: 404 });
  if (!env.TOKEN_ENC_KEY) return json(env, request, { error: "缺少 TOKEN_ENC_KEY" }, { status: 500 });
  try {
    const { sessionToken } = await decryptJson<{ sessionToken: string }>(env.TOKEN_ENC_KEY, {
      ciphertext: credential.ciphertext,
      iv: credential.iv,
    });
    return json(env, request, await nintendoDiagnostics(sessionToken, zncaConfig(env)));
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return json(env, request, { error: "诊断失败", message }, { status: 200 });
  }
}

async function handleCollect(env: Env, request: Request): Promise<Response> {
  const body = await readBody(request);
  const platform = asPlatform(typeof body.platform === "string" ? body.platform : undefined);
  if (platform) {
    const status = await collect(env, platform);
    return json(env, request, { ok: status.state === "ok", status });
  }
  const statuses = await collectAll(env);
  return json(env, request, { ok: statuses.every((status) => status.state === "ok"), statuses });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      await ensureSchema(env.SOCIAL_DB);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return json(env, request, { error: `数据库未就绪：${message}` }, { status: 500 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }

    if (path === "/health" && request.method === "GET") {
      return handleHealth(env, request);
    }

    const snapshotMatch = /^\/api\/snapshot\/([a-z]+)$/.exec(path);
    if (snapshotMatch && request.method === "GET") {
      const platform = asPlatform(snapshotMatch[1]);
      if (!platform) return json(env, request, { error: "未知平台" }, { status: 404 });
      return handleSnapshot(env, request, platform);
    }

    const linkMatch = /^\/api\/link\/([a-z]+)$/.exec(path);
    if (linkMatch) {
      const platform = asPlatform(linkMatch[1]);
      if (!platform) return json(env, request, { error: "未知平台" }, { status: 404 });
      if (!isAdmin(env, request)) return json(env, request, { error: "未授权" }, { status: 401 });
      if (request.method === "POST") return handleLink(env, request, platform);
      if (request.method === "DELETE") return json(env, request, { status: await unlink(env, platform) });
      return json(env, request, { error: "方法不支持" }, { status: 405 });
    }

    if (path === "/api/debug/nintendo" && request.method === "GET") {
      if (!isAdmin(env, request)) return json(env, request, { error: "未授权" }, { status: 401 });
      return handleNintendoDebug(env, request);
    }

    if (path === "/api/collect" && request.method === "POST") {
      if (!isAdmin(env, request)) return json(env, request, { error: "未授权" }, { status: 401 });
      return handleCollect(env, request);
    }

    return json(env, request, { error: "Not Found" }, { status: 404 });
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      collectAll(env).then((statuses) => {
        for (const status of statuses) {
          if (status.state !== "ok") {
            console.error(`[social-api] ${status.platform} 采集失败：${status.state} ${status.lastError ?? ""}`);
          }
        }
      }),
    );
  },
};
