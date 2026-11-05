import "server-only";
import { SERVER_ENV, requireEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/http";

export const FAST_MODEL = "claude-haiku-4-5";

export interface LlmCall {
  prompt: string;
  maxTokens: number;
  model?: string;
  timeoutMs?: number;
}

/** One Messages API call at temperature 0; returns the text of the reply. */
export async function callClaude(call: LlmCall): Promise<string> {
  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": requireEnv(SERVER_ENV.anthropic),
      },
      body: JSON.stringify({
        model: call.model ?? FAST_MODEL,
        max_tokens: call.maxTokens,
        temperature: 0,
        messages: [{ role: "user", content: call.prompt }],
      }),
    },
    call.timeoutMs ?? 30000,
  );
  if (!response.ok) throw new Error(`Claude returned HTTP ${response.status}`);
  const body = (await response.json()) as { content?: { type: string; text?: string }[] };
  const text = (body.content ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "").join("");
  if (!text) throw new Error("Claude returned no text");
  return text;
}

/** Extracts the first JSON object or array from model text (models sometimes wrap it in prose). */
export function extractJson(text: string): unknown {
  const match = text.match(/[[{][\s\S]*[\]}]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}
