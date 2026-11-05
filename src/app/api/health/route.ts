import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Deploy probe target. Returns the commit the running build came from, so a
 * post-deploy check can tell the new build from the old one rather than
 * trusting a bare 200.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    {
      ok: true,
      sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
      environment: process.env.VERCEL_ENV ?? "local",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
