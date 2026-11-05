# BUG P2: the test model of Supabase reads the user id in the opposite order to hosted Supabase

Card: TEMPLATE-5 (the template maintainer's board). Light path (P3 at triage, raised to P2 by class escalation).

## B1 Capture

* **Symptom.** `supabase/tests/supabase-shim.sql` defines `auth.uid()` and `auth.role()` to read
  `request.jwt.claims` first and the legacy `request.jwt.claim.<name>` setting second. Hosted
  Supabase does the opposite. A test that sets both forms to different users sees a different
  user from production.
* **How found.** Live probe during the template dry run, 2026-11-03: `pg_get_functiondef` on the
  dry-run project (Postgres 17.11). The shim comment had already said the order was modelled
  "from memory; not checked", and the initial review recorded it as unverified.
* **Build.** Template `dev` at 5f0092a.

## B2 Reproduce

`tests/unit/migrations/supabase-shim.db.test.ts`, run against the unfixed shim: 3 failed, 1 passed.

* Both forms set: received uid/role/jwt sub `...c1` / `authenticated` (claims), expected `...a1` /
  `service_role` (legacy).
* Nothing set: received `auth.jwt() is null` = false (the shim returned `{}`), expected true.
* `auth.email()`: `error: function auth.email() does not exist`.
* The claims-only case passed before the fix and is kept as a guard.

## B3 Root cause and blast radius

* **Why.** The shim's auth helpers were written from memory, not from a hosted definition, and
  nothing compared them with one. The local checks could not catch it: the shim IS their model
  of Supabase. No test exercised precedence.
* **Class sweep.** Every helper in the hosted `auth` schema (`email`, `jwt`, `role`, `uid`, read
  from `pg_proc`) against the shim: `uid` and `role` reversed, `jwt` reversed and non-NULL when
  empty, `email` missing. Four of four differ: class escalation P3 -> P2. Callers in the repo:
  none outside the shim (`grep -rn "auth\.(uid|role|jwt|email)"` in src, scripts, supabase,
  tests). `scripts/prove-db-defaults.sh` loads the same file in CI; it does not call the helpers.
* **Class.** Mock-reality divergence.
* **Barrier analysis (light path).** Only a comparison with a hosted definition could catch it;
  the new test pins the hosted behaviour with the definitions' source and date.

## Fix

The four helpers are copied from the hosted definitions, with a comment naming the source.

## B8 Prevention

The new test fails on any shim that reorders the precedence, returns `{}` for an empty JWT,
drops `auth.email()`, or drops the `nullif(..., '')` wrappers (an empty-string setting, the state
a reused connection holds after a transaction-local claim reverts). Proven red on the unfixed
shim (above) and on a mutant with the wrappers removed (`invalid input syntax for type uuid: ""`). If Supabase changes its
definitions, re-read them with `pg_get_functiondef` and update both files together.
