#!/usr/bin/env bash
# Proves the secure-defaults migration by BEHAVIOUR, against a real Postgres, not by
# reading its text.
#
#   PROVE_DATABASE_URL=postgresql://postgres@localhost:5432/postgres \
#     bash /absolute/path/scripts/prove-db-defaults.sh > db.log 2>&1; rc=$?
#
# The URL must be a superuser on a THROWAWAY server (CI's service container). It
# creates two scratch databases, each modelled on Supabase's own default grants:
#   control: the Supabase-style grants only. anon CAN execute a new function. This
#            leg proves the check is able to see the insecure state.
#   secured: the same, plus every migration in supabase/migrations. anon and
#            authenticated cannot execute a new function, anon cannot read a new
#            table, authenticated still can (allow side), and RLS is on.
# Every leg prints PASS or FAIL; the last line is DB_PROVE_RC=<0|1>.

set -uo pipefail
cd "$(dirname "$0")/.." || { echo "DB_PROVE_RC=99"; exit 99; }
URL="${PROVE_DATABASE_URL:-}"
[ -n "$URL" ] || { echo "PROVE_DATABASE_URL is not set"; echo "DB_PROVE_RC=2"; exit 2; }
echo "DB_PROVE_TREE=$(git rev-parse HEAD 2>/dev/null || echo none) DIRTY_FILES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ') SERVER=$(psql "$URL" -X -t -A -c 'show server_version' 2>&1)"

rc=0
psql_on() { psql "$1" -v ON_ERROR_STOP=1 -X -q -t -A "${@:2}"; }
db_url() { printf '%s' "${URL%/*}/$1"; }

# The same two files the local test uses (tests/unit/migrations/secure-defaults.db.test.ts),
# so the in-process check and this real-Postgres check cannot drift apart.
model_supabase() { psql_on "$1" -f supabase/tests/supabase-shim.sql; }
probe() { psql_on "$1" -f supabase/tests/probe-defaults.sql; }

expect() {
  local output="$1" key="$2" want="$3" label="$4"
  if printf '%s\n' "$output" | grep -qx "$key=$want"; then echo "PASS  $label ($key=$want)"
  else echo "FAIL  $label (want $key=$want, got $(printf '%s\n' "$output" | grep "^$key=" || echo none))"; rc=1; fi
}

fresh_db() {
  psql_on "$URL" -c "drop database if exists $1" -c "create database $1" || { echo "FAIL  could not create $1"; echo "DB_PROVE_RC=1"; exit 1; }
}

fresh_db prove_control
model_supabase "$(db_url prove_control)" || { echo "FAIL  control setup"; rc=1; }
out="$(probe "$(db_url prove_control)")" || { echo "FAIL  control probe errored"; rc=1; }
expect "$out" anon_exec yes "control: without the migration anon can execute (the check can see the bad state)"
expect "$out" rls no "control: without the migration a new table has RLS off"

fresh_db prove_secured
model_supabase "$(db_url prove_secured)" || { echo "FAIL  secured setup"; rc=1; }
for file in supabase/migrations/*.sql; do
  psql_on "$(db_url prove_secured)" -f "$file" || { echo "FAIL  migration $file did not apply"; rc=1; }
done
out="$(probe "$(db_url prove_secured)")" || { echo "FAIL  secured probe errored"; rc=1; }
expect "$out" anon_exec no "secured: anon cannot execute a new function"
expect "$out" authenticated_exec no "secured: authenticated cannot execute a new function"
expect "$out" service_exec yes "secured: service_role still can (allow side)"
expect "$out" anon_select no "secured: anon cannot read a new table"
expect "$out" authenticated_select yes "secured: authenticated keeps its grant; RLS decides (allow side)"
expect "$out" rls yes "secured: RLS is on for a new table"

psql_on "$URL" -c "drop database if exists prove_control" -c "drop database if exists prove_secured" >/dev/null
echo "DB_PROVE_RC=$rc"
exit "$rc"
