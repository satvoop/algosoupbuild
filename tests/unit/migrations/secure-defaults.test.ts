import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS = path.resolve(__dirname, "../../../supabase/migrations");

function readMigration(suffix: string): string {
  const file = readdirSync(MIGRATIONS).find((name) => name.endsWith(suffix));
  if (!file) throw new Error(`No migration ending in ${suffix} under ${MIGRATIONS}`);
  return readFileSync(path.join(MIGRATIONS, file), "utf8").toLowerCase();
}

describe("secure defaults migration", () => {
  const sql = readMigration("_secure_defaults.sql");

  // Text-level guard only. The behaviour (who can actually execute what) is proven
  // against a real Postgres by scripts/prove-db-defaults.sh in CI.
  it("revokes PUBLIC's function execute globally, since a per-schema revoke cannot remove a global grant", () => {
    expect(sql).toMatch(/alter default privileges for role postgres revoke execute on functions from public;/);
  });

  it("revokes anon and authenticated function execute in public", () => {
    expect(sql).toMatch(
      /alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;/,
    );
  });

  it("revokes default table access from anon", () => {
    expect(sql).toMatch(/alter default privileges for role postgres in schema public revoke all on tables from anon;/);
  });

  it("installs the event trigger that enables RLS on new public tables", () => {
    expect(sql).toMatch(/create event trigger enable_rls_on_new_tables/);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/schema_name = 'public'/);
  });

  it("pins the definer function's search_path", () => {
    expect(sql).toMatch(/security definer\s+set search_path = ''/);
  });
});

describe("every migration", () => {
  const files = readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql"));

  it("exists and follows the timestamp_name convention", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(file).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  it("revokes anon and authenticated execute on any SECURITY DEFINER function it creates", () => {
    for (const file of files) {
      const sql = readFileSync(path.join(MIGRATIONS, file), "utf8").toLowerCase();
      const definers = sql.match(/create (or replace )?function [a-z0-9_.]+/g) ?? [];
      if (!sql.includes("security definer")) continue;
      for (const definer of definers) {
        const name = definer.replace(/create (or replace )?function /, "");
        expect(sql, `${file}: ${name} needs an explicit revoke`).toContain(
          `revoke all on function ${name}`,
        );
      }
    }
  });
});
