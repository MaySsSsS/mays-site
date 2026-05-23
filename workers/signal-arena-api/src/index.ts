import { corsHeaders, errorResponse, jsonResponse, requireAdmin } from "./http";
import { getPublicData } from "./public-data";
import { runSignalArenaTrader } from "./runner";
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
    try {
      return jsonResponse(await getPublicData(env), env, request);
    } catch {
      return errorResponse(
        "upstream_unavailable",
        "Signal Arena upstream unavailable.",
        env,
        request,
        502
      );
    }
  }

  if (url.pathname === "/api/admin/run" && request.method === "POST") {
    if (!requireAdmin(request, env)) {
      return errorResponse("unauthorized", "Admin token is required.", env, request, 401);
    }

    const dryRun = url.searchParams.get("dryRun") !== "false";
    return jsonResponse(await runSignalArenaTrader(env, { trigger: "manual", dryRun }), env, request);
  }

  return errorResponse("not_found", "Route not found.", env, request, 404);
}

export default {
  fetch: handleFetch,
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runSignalArenaTrader(env, { trigger: "cron", dryRun: false });
  }
};
