import { describe, expect, it, vi } from "vitest";
import { createCheckDatabase } from "../../../scripts/lib/local-postgres.mjs";

// Starting an in-process Postgres takes a few seconds on a cold worker.
vi.setConfig({ testTimeout: 30_000 });

// The shim must answer like hosted Supabase. Expected values come from
// pg_get_functiondef on a hosted project (Postgres 17.11, read 2026-11-03):
// every auth helper reads its legacy single-claim setting FIRST and the claims
// JSON second, and auth.jwt() is NULL when neither is set.
const USER_LEGACY = "00000000-0000-0000-0000-0000000000a1";
const USER_CLAIMS = "00000000-0000-0000-0000-0000000000c1";

type Row = { uid: string | null; role: string | null; jwt_sub: string | null; jwt_is_null: boolean };

async function query<T>(settings: Record<string, string>, sql: string): Promise<T> {
  const db = await createCheckDatabase([]);
  try {
    for (const [name, value] of Object.entries(settings)) {
      await db.query("select set_config($1, $2, false)", [name, value]);
    }
    const result = await db.query<T>(sql);
    const row = result.rows[0];
    if (!row) throw new Error("auth probe returned no row");
    return row;
  } finally {
    await db.close();
  }
}

const AUTH_SQL = `select auth.uid()::text as uid, auth.role() as role,
  auth.jwt() ->> 'sub' as jwt_sub, auth.jwt() is null as jwt_is_null`;
const readAuth = (settings: Record<string, string>) => query<Row>(settings, AUTH_SQL);
const readEmail = (settings: Record<string, string>) =>
  query<{ email: string | null }>(settings, "select auth.email() as email");

const CLAIMS = JSON.stringify({ sub: USER_CLAIMS, role: "authenticated", email: "claims@example.test" });

describe("supabase shim auth helpers match hosted Supabase", () => {
  it("the legacy single-claim settings win when both forms are set", async () => {
    expect(
      await readAuth({
        "request.jwt.claims": CLAIMS,
        "request.jwt.claim.sub": USER_LEGACY,
        "request.jwt.claim.role": "service_role",
        "request.jwt.claim.email": "legacy@example.test",
        "request.jwt.claim": JSON.stringify({ sub: USER_LEGACY }),
      }),
    ).toEqual({ uid: USER_LEGACY, role: "service_role", jwt_sub: USER_LEGACY, jwt_is_null: false });
  });

  it("the claims JSON alone is read", async () => {
    expect(await readAuth({ "request.jwt.claims": CLAIMS })).toEqual({
      uid: USER_CLAIMS,
      role: "authenticated",
      jwt_sub: USER_CLAIMS,
      jwt_is_null: false,
    });
  });

  it("with no claims set every helper is NULL, including auth.jwt()", async () => {
    expect(await readAuth({})).toEqual({ uid: null, role: null, jwt_sub: null, jwt_is_null: true });
    expect(await readEmail({})).toEqual({ email: null });
  });

  // A reused hosted connection holds '' (not unset) once a transaction-local claim
  // reverts. Without the nullif wrappers, ''::uuid raises instead of returning NULL.
  const EMPTY = Object.fromEntries(
    ["request.jwt.claims", "request.jwt.claim", "request.jwt.claim.sub", "request.jwt.claim.role", "request.jwt.claim.email"].map(
      (name) => [name, ""],
    ),
  );

  it("with every claim setting empty ('') every helper is NULL", async () => {
    expect(await readAuth(EMPTY)).toEqual({ uid: null, role: null, jwt_sub: null, jwt_is_null: true });
    expect(await readEmail(EMPTY)).toEqual({ email: null });
  });

  it("auth.email() exists and follows the same precedence", async () => {
    expect(await readEmail({ "request.jwt.claims": CLAIMS })).toEqual({ email: "claims@example.test" });
    expect(await readEmail({ "request.jwt.claims": CLAIMS, "request.jwt.claim.email": "legacy@example.test" })).toEqual({
      email: "legacy@example.test",
    });
  });
});
