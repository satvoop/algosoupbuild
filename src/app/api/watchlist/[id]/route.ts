import { NextResponse } from "next/server";
import { getWatchlistItem, removeWatchlistItem } from "@/lib/db/watchlist";
import { latestNews } from "@/lib/db/news";
import { listRuns } from "@/lib/db/runs";
import { errorMessage, jsonError } from "@/lib/http";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid id", 400);
  try {
    const item = await getWatchlistItem(id);
    if (!item) return jsonError("Watchlist item not found", 404);
    const [news, runs] = await Promise.all([latestNews(id), listRuns(id)]);
    return NextResponse.json({ item, news, runs });
  } catch (error) {
    return jsonError(errorMessage(error), 500);
  }
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid id", 400);
  try {
    return (await removeWatchlistItem(id)) ? NextResponse.json({ ok: true }) : jsonError("Watchlist item not found", 404);
  } catch (error) {
    return jsonError(errorMessage(error), 500);
  }
}
