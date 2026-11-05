import { NextResponse } from "next/server";
import { getWatchlistItem } from "@/lib/db/watchlist";
import { latestNews } from "@/lib/db/news";
import { getStrategy } from "@/lib/db/strategies";
import { insertRun } from "@/lib/db/runs";
import { executeStrategy } from "@/lib/strategy/execute";
import { FAST_MODEL, callClaude } from "@/lib/llm";
import { errorMessage, jsonError, readJson } from "@/lib/http";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  const { id } = await context.params;
  const strategyId = ((await readJson(request)) as { strategyId?: unknown } | null)?.strategyId;
  if (!isUuid(id) || typeof strategyId !== "string" || !isUuid(strategyId)) return jsonError("Invalid id", 400);
  try {
    const [item, strategy] = await Promise.all([getWatchlistItem(id), getStrategy(strategyId)]);
    if (!item) return jsonError("Watchlist item not found", 404);
    if (!strategy || strategy.archived_at) return jsonError("Strategy not found", 404);
    const { articles } = await latestNews(id);
    const record = await executeStrategy({
      strategy, item, articles, model: FAST_MODEL,
      ask: (prompt) => callClaude({ prompt, maxTokens: 2000, timeoutMs: 30000 }),
    });
    return NextResponse.json({ run: await insertRun(record) }, { status: 201 });
  } catch (error) {
    return jsonError(errorMessage(error), 500);
  }
}
