import type { Env, PublicApiError } from "./types";

export function corsHeaders(env: Env, request: Request): HeadersInit {
  const allowedOrigins = [env.CORS_ORIGIN, "https://maysssss.cn", "http://localhost:3000"];
  const requestOrigin = request.headers.get("Origin") ?? "";
  const origin = allowedOrigins.includes(requestOrigin) ? requestOrigin : env.CORS_ORIGIN;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

export function jsonResponse(data: unknown, env: Env, request: Request, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders(env, request)
    }
  });
}

export function errorResponse(
  error: string,
  message: string,
  env: Env,
  request: Request,
  status = 500
): Response {
  const body: PublicApiError = { success: false, error, message };
  return jsonResponse(body, env, request, status);
}

export function requireAdmin(request: Request, env: Env): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  return Boolean(token && token === env.SIGNAL_ARENA_ADMIN_TOKEN);
}
