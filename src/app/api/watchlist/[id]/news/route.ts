import { NextResponse } from "next/server";
import { getWatchlistItem } from "@/lib/db/watchlist";
import { latestNews, recordFetch, recordFetchError } from "@/lib/db/news";
import { runNewsPipeline } from "@/lib/news/pipeline";
import { currentsSource } from "@/lib/news/currents";
import { FAST_MODEL, callClaude } from "@/lib/llm";
import { errorMessage, jsonError } from "@/lib/http";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context): Promise<NextResponse> {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid id", 400);
  try {
    const item = await getWatchlistItem(id);
    if (!item) return jsonError("Watchlist item not found", 404);
    const options = item.options.map((option) => option.label);
    const ask = (prompt: string, maxTokens: number) => callClaude({ prompt, maxTokens });
    try {
      const result = await runNewsPipeline(currentsSource, ask, item.title, options);
      await recordFetch(id, result, FAST_MODEL);
    } catch (pipelineError) {
      const message = errorMessage(pipelineError);
      await recordFetchError(id, [item.title], message, FAST_MODEL);
      return jsonError(`News refresh failed: ${message}`, 502);
    }
    return NextResponse.json(await latestNews(id));
  } catch (error) {
    return jsonError(errorMessage(error), 500);
  }
}
