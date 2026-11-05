import { NextResponse } from "next/server";
import { fetchTopEvents } from "@/lib/polymarket";
import { errorMessage, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ events: await fetchTopEvents() });
  } catch (error) {
    return jsonError(`Could not load Polymarket events: ${errorMessage(error)}`, 502);
  }
}
