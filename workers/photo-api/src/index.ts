/**
 * Mays Photo API - Cloudflare Worker
 * 提供照片上传、读取、删除功能，通过密码认证保护
 */

export interface Env {
  PHOTO_BUCKET: R2Bucket;
  AUTH_PASSWORD: string;
  JWT_SECRET?: string;
  CORS_ORIGIN: string;
}

interface PhotoGroup {
  id: string;
  name: string;
  city: string;
  location?: { lat: number; lng: number };
  coverUrl?: string;
  photos: Photo[];
  createdAt: string;
}

interface Photo {
  id: string;
  title: string;
  description?: string;
  date?: string;
  url?: string;
}

// 简单的 JWT 实现
async function createToken(password: string, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: "mays-photo",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 天
    })
  );

  const data = `${header}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${data}.${sig}`;
}

async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const [header, payload, sig] = parts;
    const data = `${header}.${payload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // 还原签名
    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(data)
    );

    if (!valid) return false;

    // 检查过期
    const payloadData = JSON.parse(atob(payload));
    if (payloadData.exp < Math.floor(Date.now() / 1000)) return false;

    return true;
  } catch {
    return false;
  }
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data: unknown, status = 200, origin = "*"): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 允许的来源（开发环境和生产环境）
    const allowedOrigins = [
      env.CORS_ORIGIN,
      "https://photo.maysssss.cn",
      "https://maysssss.cn",
      "http://localhost:5173",
      "http://localhost:3000",
    ];
    const requestOrigin = request.headers.get("Origin") || "";
    const origin = allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0];

    // 处理 CORS 预检
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const jwtSecret = env.JWT_SECRET || env.AUTH_PASSWORD + "-jwt-secret";

    try {
      // === 认证接口（不需要 token） ===
      if (path === "/api/auth" && method === "POST") {
        const body = (await request.json()) as { password?: string };
        if (body.password === env.AUTH_PASSWORD) {
          const token = await createToken(env.AUTH_PASSWORD, jwtSecret);
          return jsonResponse({ success: true, token }, 200, origin);
        }
        return jsonResponse({ success: false, error: "密码错误" }, 401, origin);
      }

      // === 以下接口需要认证 ===
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "");

      if (!token || !(await verifyToken(token, jwtSecret))) {
        return jsonResponse({ error: "未授权" }, 401, origin);
      }

      // === 获取分组数据 ===
      if (path === "/api/groups" && method === "GET") {
        const object = await env.PHOTO_BUCKET.get("metadata/groups.json");
        if (!object) {
          return jsonResponse({ groups: [] }, 200, origin);
        }
        const data = await object.text();
        return jsonResponse(JSON.parse(data), 200, origin);
      }

      // === 保存分组数据 ===
      if (path === "/api/groups" && method === "POST") {
        const body = await request.json();
        await env.PHOTO_BUCKET.put(
          "metadata/groups.json",
          JSON.stringify(body),
          { httpMetadata: { contentType: "application/json" } }
        );
        return jsonResponse({ success: true }, 200, origin);
      }

      // === 上传照片 ===
      if (path === "/api/upload" && method === "POST") {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const groupId = formData.get("groupId") as string;
        const photoId = formData.get("photoId") as string;

        if (!file || !groupId || !photoId) {
          return jsonResponse({ error: "缺少必要参数" }, 400, origin);
        }

        const key = `images/${groupId}/${photoId}`;
        const arrayBuffer = await file.arrayBuffer();

        await env.PHOTO_BUCKET.put(key, arrayBuffer, {
          httpMetadata: { contentType: file.type },
        });

        return jsonResponse({ success: true, key }, 200, origin);
      }

      // === 获取照片 ===
      if (path.startsWith("/api/image/") && method === "GET") {
        const key = path.replace("/api/image/", "");
        const object = await env.PHOTO_BUCKET.get(`images/${key}`);

        if (!object) {
          return new Response("Not Found", {
            status: 404,
            headers: corsHeaders(origin),
          });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Cache-Control", "public, max-age=31536000");
        Object.entries(corsHeaders(origin)).forEach(([k, v]) =>
          headers.set(k, v)
        );

        return new Response(object.body, { headers });
      }

      // === 删除照片 ===
      if (path.startsWith("/api/image/") && method === "DELETE") {
        const key = path.replace("/api/image/", "");
        await env.PHOTO_BUCKET.delete(`images/${key}`);
        return jsonResponse({ success: true }, 200, origin);
      }

      return jsonResponse({ error: "Not Found" }, 404, origin);
    } catch (error) {
      console.error("Worker error:", error);
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Internal Error" },
        500,
        origin
      );
    }
  },
};
