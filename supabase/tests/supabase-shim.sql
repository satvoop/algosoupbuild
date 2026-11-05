-- A minimal model of what a hosted Supabase database provides before any migration
-- runs: its client roles, their default grants in `public`, and the auth objects
-- migrations commonly reference. Used by the local checks (an in-process Postgres)
-- and by scripts/prove-db-defaults.sh (a real Postgres in CI). It is NOT applied to
-- any real project. If a migration needs a Supabase OBJECT that is missing here (a
-- schema, table or function), the check fails with the migration's error: add the
-- object here, never skip the check. A missing EXTENSION cannot be added here; see
-- "Extensions the local check cannot load" in docs/runbooks/deploy.md.
--
-- This model answers "what does the migration create, and who can use it". It does
-- not prove the migration applies on hosted Supabase (superuser on Postgres 18 here,
-- a non-superuser on 17 there); `supabase db push --dry-run` proves that.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

-- Supabase grants client roles access to new objects in public through default
-- privileges. The secure-defaults migration narrows exactly these.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;

create schema if not exists extensions;
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz not null default now()
);

-- Copied from pg_get_functiondef on a hosted project (Postgres 17.11, read 2026-11-03):
-- each helper reads its legacy single-claim setting FIRST and the claims JSON second,
-- and auth.jwt() is NULL when neither is set.
-- tests/unit/migrations/supabase-shim.db.test.ts pins this behaviour.
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text $$;
create or replace function auth.email() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb $$;
