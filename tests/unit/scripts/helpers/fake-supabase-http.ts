import type { FakeProject } from "./fake-supabase";

// A fetch that answers the Supabase HTTP API (Auth and PostgREST) from a FakeProject, so the
// probe's supabase-js wiring runs for real with no network. Identity: a bearer token the fake
// issued is that user; otherwise the apikey header decides (the secret key is admin, the
// publishable key is anon). Only the requests the probe makes are answered; anything else is a
// test failure, recorded in `unexpected`.
export const URL_BASE = "https://probe-test.supabase.co";
export const PUBLISHABLE = "sb_publishable_testonly0000000000";
// A dummy, split so the gate's secret scan (which matches the real key shape) does not flag a
// test value; scripts/gate.sh splits its own patterns the same way.
export const SECRET = "sb_" + "secret_testonly0000000000000000";

const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

const userJson = (id: string, email: string) => ({ id, aud: "authenticated", role: "authenticated", email, app_metadata: {}, user_metadata: {}, created_at: "2026-11-04T00:00:00Z" });

export class FakeSupabaseHttp {
  unexpected: string[] = [];
  private tokens = new Map<string, string>();

  constructor(readonly project: FakeProject) {}

  readonly fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers(init.headers);
    const body = typeof init.body === "string" && init.body !== "" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    if (url.pathname.startsWith("/auth/v1/")) return this.auth(url, method, headers, body);
    if (url.pathname.startsWith("/rest/v1/")) return this.rest(url, method, headers, body);
    return this.reject(`${method} ${url.pathname}`);
  };

  private reject(what: string): Response {
    this.unexpected.push(what);
    return json(500, { message: `unexpected request ${what}` });
  }

  private identity(headers: Headers): "admin" | "anon" | string | null {
    const bearer = (headers.get("authorization") ?? "").replace(/^Bearer /, "");
    const user = this.tokens.get(bearer);
    if (user) return user;
    const key = headers.get("apikey");
    if (key === SECRET) return "admin";
    if (key === PUBLISHABLE) return "anon";
    return null;
  }

  private auth(url: URL, method: string, headers: Headers, body: Record<string, unknown>): Response {
    const who = this.identity(headers);
    const adminUser = /^\/auth\/v1\/admin\/users\/([^/]+)$/.exec(url.pathname);
    if (method === "POST" && url.pathname === "/auth/v1/admin/users" && who === "admin") {
      if (body.email_confirm !== true) return this.reject("createUser without email_confirm");
      if (this.project.model.failCreate) return json(422, { code: 422, error_code: "signup_disabled", msg: "Signups not allowed for this instance" });
      const id = this.project.createUser(String(body.email), String(body.password));
      return json(200, userJson(id, String(body.email)));
    }
    if (adminUser?.[1] && who === "admin" && (method === "GET" || method === "DELETE")) {
      const id = decodeURIComponent(adminUser[1]);
      const user = this.project.users.get(id);
      if (!user) return json(404, { code: 404, error_code: "user_not_found", msg: "User not found" });
      if (method === "DELETE") this.project.deleteUser(id);
      return json(200, userJson(id, user.email));
    }
    if (method === "POST" && url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "password" && who === "anon") {
      const id = this.project.userFor(String(body.email), String(body.password));
      if (!id) return json(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      const token = `token-${id}`;
      this.tokens.set(token, id);
      const session = { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: 4102444800, refresh_token: `refresh-${id}` };
      return json(200, { ...session, user: userJson(id, String(body.email)) });
    }
    return this.reject(`${method} ${url.pathname} as ${who ?? "nobody"}`);
  }

  private rest(url: URL, method: string, headers: Headers, body: Record<string, unknown>): Response {
    const who = this.identity(headers);
    const table = url.pathname.slice("/rest/v1/".length);
    const column = this.project.model.markerColumn;
    const value = (url.searchParams.get(column) ?? "").replace(/^eq\./, "");
    if (table !== this.project.model.table || who === null) return this.reject(`${method} ${url.pathname} as ${who ?? "nobody"}`);
    if (who === "admin") {
      if (method === "POST") {
        this.project.rows.push(body);
        this.project.inserted.push(body);
        return json(201, null);
      }
      if (method === "DELETE") {
        this.project.deleteRows(value);
        return json(204, null);
      }
      if (method === "HEAD") {
        const count = this.project.rows.filter((row) => row[column] === value).length;
        return new Response(null, { status: 200, headers: { "content-range": `*/${count}` } });
      }
    }
    if (method === "GET") {
      const result = this.project.select(who === "anon" || who === "admin" ? null : who, value);
      if (result.error) return json(result.error.code === "42501" ? 401 : 400, { ...result.error, details: null, hint: null });
      return json(200, result.rows.map((row) => ({ [column]: row[column] })));
    }
    return this.reject(`${method} ${url.pathname} as ${who}`);
  }
}
