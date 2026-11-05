import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ROOT, applyMigrations, createCheckDatabase, readMigrations } from "../../../scripts/lib/local-postgres.mjs";

vi.setConfig({ testTimeout: 30_000 });
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const TABLES = ["watchlist_items", "news_fetches", "news_articles", "strategies", "analysis_runs"];

// Server-only access model: no client role holds any privilege on the five tables,
// RLS is on, and the LLM logs are append-only even for the server role.
describe("analyst core access model, by behaviour", () => {
  it("client roles have no privilege, RLS is on, logs are append-only, seeds exist", async () => {
    const db = await createCheckDatabase(readMigrations(MIGRATIONS));
    try {
      await applyMigrations(db, MIGRATIONS);
      for (const table of TABLES) {
        const result = await db.query<{ anon: boolean; auth: boolean; rls: boolean }>(
          `select has_table_privilege('anon', 'public.${table}', 'select,insert,update,delete') as anon,
                  has_table_privilege('authenticated', 'public.${table}', 'select,insert,update,delete') as auth,
                  (select relrowsecurity from pg_class where oid = 'public.${table}'::regclass) as rls`,
        );
        expect(result.rows[0], table).toEqual({ anon: false, auth: false, rls: true });
      }
      for (const table of ["news_fetches", "analysis_runs"]) {
        const result = await db.query<{ mutate: boolean; insert: boolean }>(
          `select has_table_privilege('service_role', 'public.${table}', 'update,delete') as mutate,
                  has_table_privilege('service_role', 'public.${table}', 'insert') as insert`,
        );
        expect(result.rows[0], table).toEqual({ mutate: false, insert: true });
      }
      const seeds = await db.query<{ count: number }>("select count(*)::int as count from public.strategies where is_seed");
      expect(seeds.rows[0]?.count).toBe(3);
    } finally {
      await db.close();
    }
  });
});
