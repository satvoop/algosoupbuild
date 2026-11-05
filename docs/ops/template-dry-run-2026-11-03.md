# Template dry run, 2026-11-03

What happened when a throwaway project was generated from this template and taken through
setup, a release and a live deploy before the template was used for real. Each leg names what
ran and the result read from the system itself. Identifiers of the throwaway repos and projects
are left out: they are deleted after the run, and this file is copied into every generated repo.

Template builds: `dev` 5f0092a (start), then 78014a7, 1c11d97 and 9c90b52 as the fixes below
merged.

## Legs

| Leg | Result | Evidence |
| --- | --- | --- |
| Generate + bootstrap | PASS after fix | Plain generate copies only `dev`; bootstrap now creates `main` from it (compare: shared history). Before the fix, generating with all branches gave two unrelated roots. |
| Gate and gate proof in a generated repo | PASS | Fresh install: `GATE_RC=0`; `prove-gate-fails.sh`: every check proven red on its planted defect. |
| Release gate (local) | PASS after fix | On `release/*`: `BASE=origin/main`, `GATE_RC=0`. Before the fix: `FAIL  git diff against origin/dev failed`, `GATE_RC=1`. |
| Supabase secure defaults (hosted, Postgres 17.11) | PASS | Before the migration: anon could execute new functions and read new tables, RLS off. After: anon/authenticated cannot execute, anon cannot read, RLS on automatically; event trigger accepted for the non-superuser migration role. |
| RLS over HTTP | PASS | Anon read of a new table: 401 with code `42501` (not `[]`); control table granted on purpose returned `[]`. Owner policy: owner sees own row, a stranger sees none, admin read shows both rows exist. |
| Vercel setup | PASS after fix | `setup-vercel.mjs` then `check-vercel.mjs`: `CHECK_RC=0`; a project created the plain way: `CHECK_RC=1` on all five items. |
| Production deploy | PASS | `/api/health` returned the `main` merge commit SHA; live Playwright smoke 3/3; negative run with the previous SHA failed as expected. |
| Preview isolation | PASS | A branch push built as a preview behind Vercel login; production stayed on `main`. |
| Clean agent config | PASS | Notion limited to four tools by deny rules (search proven absent); one card cycle (create, stage, gate line, read-back) 35 s; scrub of the session transcript for private names: 0 hits, control 1,531 hits. |

## Defects found and fixed (each with a regression test that failed first)

* Generated repos could not release: no `main`, or `main` and `dev` with no shared history.
  Fixed in bootstrap and the gate.
* A new Vercel project's first deployment is always production, whatever branch it comes
  from (Vercel docs), so an unreviewed branch went live. Production also built on a different
  Node major from CI (`engines.node` overrides the project setting). Fixed by
  `scripts/setup-vercel.mjs` (main deploys first) and one Node major in `.nvmrc` and `engines`.
* The local model of Supabase's auth helpers read the user id in the opposite order to hosted
  Supabase. Fixed from the hosted definitions.

## Unproven or open

* The CLI migration path (`npm run db:push`) was not run; migrations were applied through the
  Supabase connector, which stamps its own version. One path per project: open item.
* The hosted project's auth settings (password rules, confirmations) were not checked;
  `supabase/config.toml` drives only the local stack. Open item.
* The server admin client (secret key) was not exercised.
* Sign-up through a rendered UI: the template has none; signed-in access was simulated in SQL.
* CI did not run (account-level GitHub Actions block on private repos); every merge was gated
  locally on the exact tree.
* An interactive `/export` transcript was not scrubbed; a headless transcript stood in.
