-- Secure defaults for every table and function the `postgres` role creates after
-- this migration (migrations run as postgres). Idempotent: safe to re-run.
-- Behaviour is proven against a real database by scripts/prove-db-defaults.sh.

-- 1. A private schema for definer functions and internals: not exposed through the
--    API, not usable by client roles. A policy that calls private.some_fn() needs
--    BOTH `grant usage on schema private to authenticated` and
--    `grant execute on function private.some_fn() to authenticated`, written in the
--    migration that creates the function, with the reason in a comment.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 2. Functions are not callable by client roles unless granted on purpose.
--    Two statements, because two different defaults grant EXECUTE:
--    * PUBLIC holds EXECUTE on every new function through a GLOBAL default. A
--      per-schema statement cannot remove a global grant (Postgres manual,
--      ALTER DEFAULT PRIVILEGES), so this revoke has no IN SCHEMA.
--    * Supabase also grants EXECUTE to anon and authenticated directly, per schema.
--    Trigger functions are unaffected: a trigger fires without an EXECUTE check.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- 3. New tables and sequences are not readable by anonymous visitors unless granted
--    on purpose: an explicit GRANT plus a policy, in the same migration, with the reason.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;

-- 4. Row level security is switched on automatically for every new table in public,
--    so a table can never be created exposed by accident. Policies are still written
--    per table; with RLS on and no policy, access is denied.
create or replace function private.enable_rls_on_new_table()
returns event_trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  obj record;
begin
  for obj in
    select object_identity
    from pg_event_trigger_ddl_commands()
    where object_type = 'table'
      and schema_name = 'public'
      and not in_extension -- an extension's own tables belong to the extension
      and command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  loop
    execute format('alter table %s enable row level security', obj.object_identity);
  end loop;
end;
$$;

revoke all on function private.enable_rls_on_new_table() from public, anon, authenticated;

drop event trigger if exists enable_rls_on_new_tables;
create event trigger enable_rls_on_new_tables
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function private.enable_rls_on_new_table();
