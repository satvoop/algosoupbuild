import { NextResponse } from "next/server";
import { listWatchlist, upsertWatchlistItem } from "@/lib/db/watchlist";
import { parseMarketEvent } from "@/lib/validate";
import { errorMessage, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ items: await listWatchlist() });
  } catch (error) {
    return jsonError(errorMessage(error), 500);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const event = parseMarketEvent(await readJson(request));
  if (!event) return jsonError("Invalid event", 400);
  try {
    return NextResponse.json({ item: await upsertWatchlistItem(event) }, { status: 201 });
  } catch (error) {
    return jsonError(errorMessage(error), 500);
  }
}
