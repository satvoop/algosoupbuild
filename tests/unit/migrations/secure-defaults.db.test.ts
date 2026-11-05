import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ROOT, applyMigrations, createCheckDatabase, readMigrations } from "../../../scripts/lib/local-postgres.mjs";

// Starting an in-process Postgres takes a few seconds on a cold worker.
vi.setConfig({ testTimeout: 30_000 });
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");

// Behaviour, not text: the secure defaults are applied to an in-process Postgres
// that models Supabase's default grants, and the probe asks who can actually use a
// newly created function and table. CI repeats this on a real Postgres 17
// (scripts/prove-db-defaults.sh), from the same two SQL files.
const PROBE = readFileSync(path.join(ROOT, "supabase", "tests", "probe-defaults.sql"), "utf8");

async function probe(withMigrations: boolean): Promise<Record<string, string>> {
  const db = await createCheckDatabase(withMigrations ? readMigrations(MIGRATIONS) : []);
  try {
    if (withMigrations) await applyMigrations(db, MIGRATIONS);
    const results = await db.exec(PROBE);
    const lines = results.flatMap((result) => result.rows.map((row) => String((row as { line: string }).line)));
    return Object.fromEntries(lines.map((line) => line.split("=") as [string, string]));
  } finally {
    await db.close();
  }
}

describe("secure defaults, by behaviour", () => {
  it("control: without the migration the check sees the insecure state", async () => {
    expect(await probe(false)).toMatchObject({ anon_exec: "yes", rls: "no" });
  });

  it("secured: client roles cannot execute new functions, anon cannot read new tables, RLS is on", async () => {
    expect(await probe(true)).toEqual({
      anon_exec: "no",
      authenticated_exec: "no",
      service_exec: "yes",
      anon_select: "no",
      authenticated_select: "yes",
      rls: "yes",
    });
  });
});
