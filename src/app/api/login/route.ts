import { NextResponse } from "next/server";
import { SERVER_ENV, requireEnv } from "@/lib/env";
import { SESSION_COOKIE, SESSION_TTL_MS, createSessionToken, passwordMatches } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid request", 400);
    throw error;
  }
  const attempt = (body as { password?: unknown } | null)?.password;
  if (typeof attempt !== "string" || attempt.length === 0 || attempt.length > 200) {
    return jsonError("Invalid request", 400);
  }
  const secret = requireEnv(SERVER_ENV.appPassword);
  if (!(await passwordMatches(secret, attempt))) return jsonError("Wrong password", 401);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(secret, Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return response;
}
