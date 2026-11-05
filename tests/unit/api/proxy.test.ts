import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth/session";

describe("password gate proxy (AC1)", () => {
  it("lets a valid cookie through and leaves login and health open", async () => {
    process.env.APP_PASSWORD = "gate-pw";
    const token = await createSessionToken("gate-pw", Date.now());
    const request = new NextRequest("http://test/watchlist", { headers: { cookie: `${SESSION_COOKIE}=${token}` } });
    expect((await proxy(request)).headers.get("x-middleware-next")).toBe("1");
    expect((await proxy(new NextRequest("http://test/api/health"))).headers.get("x-middleware-next")).toBe("1");
  });
  it("redirects pages and refuses APIs without a valid cookie", async () => {
    process.env.APP_PASSWORD = "gate-pw";
    const page = await proxy(new NextRequest("http://test/strategies"));
    expect(page.status).toBe(307);
    expect(page.headers.get("location")).toBe("http://test/login");
    const api = await proxy(new NextRequest("http://test/api/watchlist", { headers: { cookie: `${SESSION_COOKIE}=1.forged` } }));
    expect(api.status).toBe(401);
  });
});
