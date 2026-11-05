-- Creates one function and one table as the migration role, then reports who can
-- use them. Values are spelled yes/no in SQL so no reader depends on how a Postgres
-- version renders a boolean. Read by scripts/prove-db-defaults.sh and by
-- tests/unit/migrations/secure-defaults.db.test.ts.
create function public.prove_fn() returns int language sql as 'select 1';
create table public.prove_t (id int);
select 'anon_exec=' || case when has_function_privilege('anon', 'public.prove_fn()', 'EXECUTE') then 'yes' else 'no' end as line;
select 'authenticated_exec=' || case when has_function_privilege('authenticated', 'public.prove_fn()', 'EXECUTE') then 'yes' else 'no' end as line;
select 'service_exec=' || case when has_function_privilege('service_role', 'public.prove_fn()', 'EXECUTE') then 'yes' else 'no' end as line;
select 'anon_select=' || case when has_table_privilege('anon', 'public.prove_t', 'SELECT') then 'yes' else 'no' end as line;
select 'authenticated_select=' || case when has_table_privilege('authenticated', 'public.prove_t', 'SELECT') then 'yes' else 'no' end as line;
select 'rls=' || case when relrowsecurity then 'yes' else 'no' end as line from pg_class where oid = 'public.prove_t'::regclass;
