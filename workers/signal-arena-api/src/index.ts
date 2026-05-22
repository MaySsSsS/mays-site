import { corsHeaders, errorResponse, jsonResponse, requireAdmin } from "./http";
import { getCachedPublicData } from "./storage";
import type { Env } from "./types";

async function handleFetch(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(env, request) });
  }

  const url = new URL(request.url);

  if (url.pathname === "/health" && request.method === "GET") {
    return jsonResponse({ status: "ok" }, env, request);
  }

  if (url.pathname === "/api/public/all" && request.method === "GET") {
    const cached = await getCachedPublicData(env);
    if (cached) {
      return jsonResponse(cached, env, request);
    }

    return errorResponse("not_ready", "Signal Arena data is not ready yet.", env, request, 503);
  }

  if (url.pathname === "/api/admin/run" && request.method === "POST") {
    if (!requireAdmin(request, env)) {
      return errorResponse("unauthorized", "Admin token is required.", env, request, 401);
    }

    return jsonResponse({ success: true, status: "not_implemented" }, env, request);
  }

  return errorResponse("not_found", "Route not found.", env, request, 404);
}

export default {
  fetch: handleFetch,
  async scheduled(_event: ScheduledEvent, _env: Env): Promise<void> {
    // Runner is wired in later tasks.
  }
};
