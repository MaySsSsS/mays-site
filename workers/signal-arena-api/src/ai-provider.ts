import { extractDecisionJson } from "./prompt";
import type { AiDecision, Env } from "./types";

type ResponsesApiResult = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOutputText(result: ResponsesApiResult): string {
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text;
  }

  const text = result.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((content): content is string => typeof content === "string" && content.trim().length > 0)
    .join("\n");

  if (!text) {
    throw new Error("Responses API returned no text output");
  }

  return text;
}

function parseResponsesEventStream(raw: string): ResponsesApiResult {
  const deltas: string[] = [];
  let completedResponse: ResponsesApiResult | null = null;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      continue;
    }

    const payload = trimmed.slice("data:".length).trim();
    if (!payload || payload === "[DONE]") {
      continue;
    }

    const event = JSON.parse(payload) as unknown;
    if (!isRecord(event)) {
      continue;
    }

    if (typeof event.delta === "string") {
      deltas.push(event.delta);
    }

    if (isRecord(event.response)) {
      completedResponse = event.response as ResponsesApiResult;
    } else if ("output_text" in event || "output" in event) {
      completedResponse = event as ResponsesApiResult;
    }
  }

  if (deltas.length > 0) {
    return { output_text: deltas.join("") };
  }

  if (completedResponse) {
    return completedResponse;
  }

  throw new Error("Responses API returned no text output");
}

async function readResponsesApiResult(response: Response): Promise<ResponsesApiResult> {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("text/event-stream") || raw.trimStart().startsWith("data:")) {
      return parseResponsesEventStream(raw);
    }

    return JSON.parse(raw) as ResponsesApiResult;
  } catch (error) {
    if (error instanceof Error && error.message === "Responses API returned no text output") {
      throw error;
    }

    throw new Error("Responses API returned invalid JSON");
  }
}

async function requestDecision(
  env: Env,
  prompt: { system: string; user: string },
  model: string,
  reasoningEffort: string
): Promise<AiDecision> {
  const response = await fetch(`${env.SIGNAL_ARENA_AI_BASE_URL.replace(/\/$/, "")}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.SIGNAL_ARENA_AI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: reasoningEffort },
      store: env.SIGNAL_ARENA_AI_DISABLE_RESPONSE_STORAGE !== "true",
      input: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}`);
  }

  const result = await readResponsesApiResult(response);
  return extractDecisionJson(getOutputText(result));
}

async function requestDecisionWithFallback(
  env: Env,
  prompt: { system: string; user: string },
  primaryModel: string,
  primaryReasoningEffort: string,
  fallbackModel: string,
  fallbackReasoningEffort: string
): Promise<AiDecision> {
  try {
    return await requestDecision(env, prompt, primaryModel, primaryReasoningEffort);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (
      !message.includes("Responses API returned no text output") &&
      !message.includes("Responses API returned invalid JSON") &&
      !message.includes("AI provider returned 502") &&
      !message.includes("AI provider returned 503") &&
      !message.includes("AI provider returned 524")
    ) {
      throw error;
    }

    return await requestDecision(env, prompt, fallbackModel, fallbackReasoningEffort);
  }
}

export async function requestStrictDecision(
  env: Env,
  prompt: { system: string; user: string }
): Promise<AiDecision> {
  return await requestDecisionWithFallback(
    env,
    prompt,
    env.SIGNAL_ARENA_AI_STRICT_MODEL,
    env.SIGNAL_ARENA_AI_STRICT_REASONING_EFFORT,
    env.SIGNAL_ARENA_AI_LIGHT_MODEL,
    env.SIGNAL_ARENA_AI_LIGHT_REASONING_EFFORT
  );
}

export async function requestLightDecision(
  env: Env,
  prompt: { system: string; user: string }
): Promise<AiDecision> {
  return await requestDecision(
    env,
    prompt,
    env.SIGNAL_ARENA_AI_LIGHT_MODEL,
    env.SIGNAL_ARENA_AI_LIGHT_REASONING_EFFORT
  );
}
