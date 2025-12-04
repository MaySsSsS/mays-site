/**
 * Mays Game API - Cloudflare Worker
 * 提供 Steam 游戏数据读取（从 R2 存储桶）
 */

export interface Env {
  GAME_BUCKET: R2Bucket;
  CORS_ORIGIN: string;
  UPLOAD_SECRET: string; // 上传密钥
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 允许的来源
    const allowedOrigins = [
      env.CORS_ORIGIN,
      "https://game.maysssss.cn",
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

    try {
      // === 获取 Steam 游戏数据 ===
      if (
        (path === "/api/steam-games" || path === "/api/steam-games.json") &&
        method === "GET"
      ) {
        const object = await env.GAME_BUCKET.get("steam-games.json");

        if (!object) {
          return new Response(JSON.stringify({ error: "Data not found" }), {
            status: 404,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
          });
        }

        const data = await object.text();

        return new Response(data, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600", // 缓存 1 小时
            ...corsHeaders(origin),
          },
        });
      }

      // === 健康检查 ===
      if (path === "/health" && method === "GET") {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        });
      }

      // === 上传 Steam 数据（需要密钥） ===
      if (path === "/api/upload" && method === "POST") {
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");

        if (!token || token !== env.UPLOAD_SECRET) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
          });
        }

        const data = await request.text();
        await env.GAME_BUCKET.put("steam-games.json", data, {
          httpMetadata: { contentType: "application/json" },
        });

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        });
      }

      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Internal Error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        }
      );
    }
  },
};
