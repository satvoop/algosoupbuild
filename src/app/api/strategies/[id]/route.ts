import { NextResponse } from "next/server";
import { DuplicateNameError, archiveStrategy, updateStrategy } from "@/lib/db/strategies";
import { validateStrategy } from "@/lib/strategy/template";
import { errorMessage, jsonError, readJson } from "@/lib/http";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context): Promise<NextResponse> {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid id", 400);
  const input = validateStrategy(await readJson(request));
  if (typeof input === "string") return jsonError(input, 400);
  try {
    const strategy = await updateStrategy(id, input);
    return strategy ? NextResponse.json({ strategy }) : jsonError("Strategy not found", 404);
  } catch (error) {
    if (error instanceof DuplicateNameError) return jsonError(error.message, 409);
    return jsonError(errorMessage(error), 500);
  }
}

/** Archive, not delete: past runs keep pointing at the strategy (data-model.md). */
export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid id", 400);
  try {
    return (await archiveStrategy(id)) ? NextResponse.json({ ok: true }) : jsonError("Strategy not found", 404);
  } catch (error) {
    return jsonError(errorMessage(error), 500);
  }
}
