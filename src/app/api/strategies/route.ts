import { NextResponse } from "next/server";
import { DuplicateNameError, createStrategy, listStrategies } from "@/lib/db/strategies";
import { validateStrategy } from "@/lib/strategy/template";
import { errorMessage, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ strategies: await listStrategies() });
  } catch (error) {
    return jsonError(errorMessage(error), 500);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const input = validateStrategy(await readJson(request));
  if (typeof input === "string") return jsonError(input, 400);
  try {
    return NextResponse.json({ strategy: await createStrategy(input) }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateNameError) return jsonError(error.message, 409);
    return jsonError(errorMessage(error), 500);
  }
}
