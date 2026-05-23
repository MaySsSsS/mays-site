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

  const result = (await response.json()) as ResponsesApiResult;
  return extractDecisionJson(getOutputText(result));
}

export async function requestStrictDecision(
  env: Env,
  prompt: { system: string; user: string }
): Promise<AiDecision> {
  return await requestDecision(
    env,
    prompt,
    env.SIGNAL_ARENA_AI_STRICT_MODEL,
    env.SIGNAL_ARENA_AI_STRICT_REASONING_EFFORT
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
