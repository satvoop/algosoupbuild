# Review: initial template

Branch `feat/initial-template` -> `dev`. Reviewer: fresh-context Stage 5 reviewer (it read
the spec, the diff and the lenses, never the building session). Lenses: COMMON 1-6 and the
data-model checklist D1-D12. Machine-specific scratch paths are redacted as `<scratch>`.

## Round 1 (tree d80f77a): BLOCK

Findings verbatim, each followed by its resolution.

* **S3 `secure_defaults.sql:15`** -- `alter default privileges IN SCHEMA public revoke
  execute on functions from public, ...` is a no-op for PUBLIC: a per-schema statement
  cannot revoke a global default. Every new function kept PUBLIC EXECUTE, and the text
  test pinned the ineffective statement.
  **Resolved (38c2ca6):** global `alter default privileges for role postgres revoke
  execute on functions from public`, plus per-schema revokes for anon and authenticated.
  `scripts/prove-db-defaults.sh` proves the behaviour against Postgres 17 in CI, with a
  control database showing that the check can see the insecure state.
* **S3 `prove-gate-fails.sh:29,63-64`** -- the tar copied `.git`, which in a worktree is a
  pointer to the shared repository, so the branch plant reset the real `main` and moved the
  real HEAD. **Resolved:** each sandbox is its own `git init` repository and `.git` is never
  copied. Re-run inside a worktree with a local `main`: main a461f02 before and after, the
  worktree HEAD unchanged, PROVE_RC=0.
* **S2 `prove-gate-fails.sh:30`** -- symlinked node_modules made `next build` fail with no
  defect planted, so "PROVEN build" was red for the wrong reason. **Resolved:** node_modules
  is hard-linked, and a CONTROL leg runs the full gate on an unmutated copy and must be green
  before any mutation counts.
* **S2 `gate.sh:82,97`** -- untracked files were concatenated, so one binary file switched
  grep to "binary file matches" and hid later secrets. **Resolved:** each untracked file is
  scanned on its own with `grep -a`. A new proof leg plants a binary file before the secret.
* **S2 `gate.sh:73-80`** -- the base was hard-wired to origin/dev, and the committed-diff
  leg was never planted. **Resolved:** `GATE_BASE` is set in CI to the PR base or the pushed
  range (an all-zero SHA falls back to dev). A new proof leg commits a secret.
* **S2 gate evidence on a dirty tree with install skipped.** **Resolved:** a skipped install
  reports SKIP, not PASS. The header records ONLY and SKIP_INSTALL. The gate was re-run with
  install (see Gate evidence).
* **S2 Dependabot branches fail the branch step.** **Resolved:** `dependabot/*` is allowed.
* **S2 strict status checks plus squash releases deadlock the second release.**
  **Resolved:** `scripts/release.sh` cuts `release/<slug>` from main carrying dev's exact
  tree. The deploy runbook, profile and `/timebox` use it.
* **S2 the CSP had no reporting, and `script-src 'self'` would break Next hydration once
  promoted.** **Resolved:** the policy is enforced on production builds and matches what Next
  emits (`'unsafe-inline'` until nonces, stated as the one known gap). The smoke test fails
  on any CSP console violation.
* **S2 gitleaks may 403 with `contents: read` only.** **Resolved:** the job grants
  `pull-requests: read`. Still UNMEASURED until the first CI run.
* **S2 dictionary parser failed open on literals, UNLOGGED tables and CTAS.** **Resolved:**
  literals and dollar quotes are stripped first. UNLOGGED/TEMP tables are read. CTAS and
  SELECT INTO fail closed. ALTER is parsed by clause, so `add generated` is not a column.
  Unit tests cover each case.
* **S2 no migration lint and no named debt.** **Resolved:** `migration-lint` waiver (owner
  Sat, 2027-01-31), named in the profile's data_model slot.
* **S1s, all resolved:**
  * a bare `--only` no longer hangs (gate and bootstrap);
  * the header carries the options;
  * typecheck and lint print file counts, and zero fails;
  * URI-credential pattern added;
  * `.env*` is never copied into sandboxes, and plant failures are reported;
  * the private-schema USAGE requirement is documented;
  * `FOR ROLE postgres`;
  * EXPECTED_SHA is required when BASE_URL is set;
  * the yaml rationale is in the ADR;
  * waivers parser unit tests added;
  * `/timebox` maps E1-E4, commits only on rc 0, adds the 53-minute stop and uses
    `--skip-install` between slices;
  * the bootstrap sed escapes `&`, `#` and `\`;
  * SECURITY.md wording corrected;
  * a seed path exists (`db:push:seed`).
* **S0s:** HSTS `preload` removed. The config-ban limit (a computed key evades a text grep)
  is accepted: it is a tripwire, not a parser. Typed clients wait for the first table
  (`db:types`).
* **D10:** the dictionary check now fails a table with no retention.

Questions answered:
* The Notion space, DBs and skeleton cards exist; they are workspace artifacts, not repo
  files.
* The supautils event-trigger acceptance, the role used by `db push` and the private-repo
  ruleset plan are measured in the dry run (`docs/ops/`).
* The live anon probe asserts `42501`, not `[]` (deploy runbook, profile).
* The full gate takes about 30s with install, and the proof about 35s.

## Round 2 (tree 03683f0): BLOCK

Round 1 resolutions re-checked by the reviewer:
* worktree leak, untracked binary, GATE_BASE, bare `--only`, release deadlock and CSP
  hydration: RESOLVED (the CSP was measured on `next start`: 9 scripts, 0 errors);
* the secure-defaults privilege logic: RESOLVED (replayed by the reviewer on PGlite).

New findings, each followed by its resolution:

* **S3 `prove-db-defaults.sh`** -- `'key=' || boolean` renders `true`/`false`, but the
  expects compared `t`/`f`, so the required `db-defaults` check could never pass.
  **Resolved:** the probe spells out `yes`/`no` in SQL. Replayed locally on PGlite (Postgres
  18.6), reading the SQL and the expects from the script itself: 8/8 PASS. Against the round 1
  migration the same replay FAILS on anon and authenticated execute, so the check catches
  the original bug.
* **S3 `check-data-dictionary.mjs`** -- literals were stripped before comments, so an
  apostrophe in a comment hid a whole table (fail open). **Resolved:** a single
  left-to-right scanner for comments (nested block comments too), `'...'` and `E'...'`
  strings, dollar quotes and quoted identifiers. Tests cover apostrophes in line and block
  comments.
* **S2 `gate.sh` diffs without `--text`** -- a key in a committed or working file git calls
  binary passed. **Resolved:** `--text` on both diffs, and a proof leg plants a key in a
  committed binary file.
* **S1s, all resolved:**
  * prove sandboxes hard-link a private copy of node_modules (0 writes reach the real install,
    measured against a marker, with a control write detected);
  * prove and db logs print their tree;
  * `LIKE` fails closed, `PARTITION OF` inherits its parent's columns, SELECT INTO is detected
    only at statement start (a CTE insert passes), and `E''` strings are handled, all with
    tests;
  * the TEMP and SELECT INTO tests were added;
  * `e2e` is a required check;
  * the `[see .env]` exemption was removed (it could hide a key; the placeholder never matches
    the value pattern anyway);
  * the RLS trigger skips extension-owned tables (`not in_extension`).
* **Spec deviations, for the owner's approval:**
  * the CSP is enforced on production builds rather than Report-Only. Reason: Report-Only had
    no report endpoint, so it could never show anything, and its promotion path broke
    hydration;
  * prove uses hard links rather than symlinks. Reason: a symlinked node_modules breaks the
    build.
* **Still unmeasured until CI and the dry run:**
  * `db-defaults` on postgres:17.10 (replayed on 18.6 only);
  * gitleaks on a private repo;
  * the supautils event-trigger permission;
  * the Vercel preview toolbar under the CSP (the smoke test ignores `vercel.live` only).

## Round 3 (tree a1b3699): BLOCK

Round 2 resolutions confirmed by the reviewer:
* DB probe parsing, including when psql cannot connect;
* prove isolation and cleanup;
* the exemption removal;
* `in_extension`;
* the scanner, on 15 tricky inputs: comments, nested comments, dollar quotes, `$1`, E''
  strings.

* **S2 `check-data-dictionary.mjs`** -- the round 2 SELECT INTO rule only looked between a
  leading `select` and the first `from`, so the CTE, subquery-in-projection and
  parenthesised forms passed, and each creates a real table (confirmed on PGlite).
  **Resolved, by design rather than by case:** the check now fails closed on anything it does
  not fully read.
  * Every `CREATE ... TABLE` in a migration is counted, and must be one of the forms parsed,
    or the check stops.
  * Every top-level `INTO` that is not `INSERT INTO`/`MERGE INTO` stops it, in any position.
  * The reviewer's 31 probe cases now all read correctly or fail closed with a clear message.
* **S1s, all resolved:**
  * identifiers: quoted names with any characters, `""` escapes, non-ASCII and `$` names,
    quoted column names with spaces;
  * `CREATE TABLE ... OF type` fails closed; `CREATE FOREIGN TABLE` is read;
  * the smoke test's preview-toolbar exception is judged on the blocked resource's URL
    (`https://vercel.live/...`) only;
  * `.cache/` is gitignored.
* **S0s:**
  * Resolved: added lines use a `\x01` marker (`--output-indicator-new`), so a content line
    starting `++ ` is scanned, with a new proof leg.
  * Accepted: one node_modules copy per proof run (about 45s, 700MB, removed on exit).
  * Accepted: a partition records its parent's columns as they stood at creation; the
    parent's rows still classify any later column.
  * Accepted: the `not in_extension` branch is unexercised (no extension table in the
    replay).

## Round 4 (tree 0ca0bb8): BLOCK

Confirmed by the reviewer:
* the SELECT INTO forms are refused;
* identifiers are read;
* no false positives on CREATE RULE, CREATE TRIGGER, COPY, policies, GRANT, MERGE or a CTE
  insert;
* the `\x01` marker is correct on multibyte and binary content.

New findings, each followed by its resolution:

* **S2 CTAS with a column list, and INHERITS** -- `create table t (a) as select ...` and
  `create table child (...) inherits (parent)` create columns the parser never recorded.
  **Resolved, by replacing the parser.** After four rounds the pattern was clear: a regex
  reader of SQL keeps missing forms that create columns. The check now APPLIES the
  migrations to an in-process Postgres (PGlite, `scripts/lib/local-postgres.mjs`) and reads
  the catalog, subtracting the Supabase model's own relations. The tests cover CTAS with a
  column list, SELECT INTO after a CTE, INHERITS, LIKE, a typed table, a column named
  `exclude`, materialized views, quoted and non-ASCII names, and a migration that does not
  apply (fails closed, naming the file). The secure defaults are now ALSO tested by behaviour
  in the gate (`secure-defaults.db.test.ts`), from the same SQL files the CI Postgres proof
  uses.
* **S2 smoke: Chromium 151 prints "Loading the script '...' violates"** -- the console
  regex never matched, so the preview-toolbar exception could not fire. **Resolved:**
  violations come from the browser's `securitypolicyviolation` event (`blockedURI` as data),
  not console text. Measured on Chromium 156:
  * a clean build passes 3/3;
  * a planted `img-src` violation fails the test with
    `img-src https://example.test/planted.png`.
  * The `vercel.live` exception leg is UNPROVEN: the planted toolbar script did not surface
    as a violation, either filtered or never requested.
* **S1 `exclude` column, CREATE PUBLICATION false positive** -- gone with the parser.
* **S1 colour or external diff config could empty the scan** -- **Resolved:**
  `--no-color --no-ext-diff --no-textconv`.
* **S0s** (alias-balanced count, IMPORT FOREIGN SCHEMA message, combining marks) -- gone with
  the parser.
* **Cost:** the test step takes about 29s (each dictionary case starts a database); a gate
  without install is about 42s, with install about 62s. Per-step timings are now in the log.

## Round 5 (tree 306ee20): APPROVE

The reviewer measured the catalog-based design directly. Correct on:
* a column added to auth.users, and renames;
* `private.*` tables;
* create-then-drop;
* temp tables, and CTAS from a temp table;
* unlogged, partitioned, identity and composite-typed columns, and materialized views;
* quoted and mixed-case names;
* a missing extension, which fails closed.

Smoke collection was measured for connect-src, frame-src, report-only and a head-time
stylesheet. No S3/S2. S1s fixed in this PR, as asked:

* **S1 `vercel.live` prefix matched look-alike origins.** **Resolved:** an exact
  `new URL(...).origin` comparison. Measured: `https://vercel.live.evil.test/planted.png`
  now fails the smoke test.
* **S1 a public table literally named "auth.users" merged with the model's auth.users.**
  **Resolved:** relation keys quote any dotted part (`public."auth.users"`), with a test.
* **S1 only 8 of 34 bundled extensions mapped; the remedy text named the shim.**
  **Resolved:** all 34 bundled contrib extensions load on demand (a test covers btree_gist).
  An unbundled one fails closed (a test covers vector). The deploy runbook has the real remedy,
  and the gap is carded (Notion TEMPLATE-2).
* **S1 no test pinned "a column added to a model relation is reported", or the temp-table
  exclusion.** **Resolved:** both tests added.
* **S0s:**
  * Resolved: the catalog query is `pg_catalog`-qualified, and the shim says what it does not
    prove (applying on hosted).
  * Changed but UNVERIFIED: `auth.uid()`/`auth.role()` now read the claims JSON and the
    legacy setting. The two reviewers' memories disagree on which hosted Supabase reads
    first, and it matters only when both are set and differ. Check against a
    `supabase db dump` before any test relies on it.

## Round 6 (tree 205811a): APPROVE

All round 5 S1s were verified by measurement:
* key matching both ways;
* all 34 extensions import, with no cold-start cost;
* `originOf` handles keywords, `data:`, userinfo and look-alike origins;
* the shim functions behave as modelled.

Two S1s fixed:
* a test for the dictionary-side key normalisation (`public.notes`, `private.notes`,
  `auth.users`, `public."auth.users"`) plus a match through the `public.` prefix;
* smoke evidence now records the tree it ran on (in `docs/ops/` with the dry run).

S0 accepted: the substring extension match loads `lo` needlessly (harmless, measured).
  * Accepted: child-frame CSP violations are not read (the template has no frames);
    information_schema tables are superuser-only locally; PGlite's cold start per case (about
    2s).

## Gate evidence

Quoted in the PR body from the committed head's own logs.
