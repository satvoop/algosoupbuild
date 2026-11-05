import { afterEach, describe, expect, it } from "vitest";
import * as route from "./route";
import { GET } from "./route";

describe("GET /api/health", () => {
  afterEach(() => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_ENV;
  });

  it("reports the deployed commit when Vercel provides it", async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = "abc123";
    process.env.VERCEL_ENV = "production";
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      sha: "abc123",
      environment: "production",
    });
  });

  // The route has no failure mode of its own; its error path is every other
  // method, which Next.js answers with 405 because only GET is exported.
  it("exports only GET, so any other method is refused", () => {
    const handlers = Object.keys(route).filter((name) => /^[A-Z]+$/.test(name));
    expect(handlers).toEqual(["GET"]);
  });

  it("reports local when running outside Vercel", async () => {
    const body: unknown = await GET().json();
    expect(body).toEqual({ ok: true, sha: "local", environment: "local" });
  });
});
