import { NextResponse } from "next/server";

/** Fetch with a hard timeout. Only fixed, allow-listed hosts are ever passed in. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.name === "AbortError" ? "The request timed out" : error.message;
  }
  return "Unknown error";
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** Reads a JSON body; a malformed body (SyntaxError) is the one handled case and reads as null. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}
