# Migration analyst_core, 2026-11-05

* File: `supabase/migrations/20261105003500_analyst_core.sql` (applied once; not idempotent).
* Applied: 2026-11-05 ~00:41Z to project ref `rdkeajyiyoonrxgesqrr` with the connector's `apply_migration` (name `analyst_core`, query = the file's exact contents). Result: `{"success":true}`. No seed.sql (seed strategies are in the migration).
* Live probe, catalog (execute_sql): all five tables `rls=true`, `policies=0`, `anon_any=false`, `auth_any=false`; `service_mutate=false` on `news_fetches` and `analysis_runs`.
* Live probe, anon REST with the publishable key, every table: `401 42501` (PROBE_RC=0).
* Not run: `scripts/probe-rls.mjs` owner/stranger legs. There is no owner column; the access model is server-only (no client role has any privilege), so those legs do not apply. The authenticated deny is proven in the gate by `tests/unit/migrations/analyst-core.db.test.ts`, shown red when the authenticated revoke is removed (RED_RC=1).
