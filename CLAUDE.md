# Project rules for coding agents

This file is the context every agent session starts from. It is short on purpose: rules
that are enforced by a script say which script, and everything else points at a doc.

## What this is

A Next.js (App Router) + TypeScript + Supabase + Vercel product, generated from a template.
The first spec replaces this paragraph with what the product is, who uses it, and what it
does NOT do.

## Branches and merges

* `dev` is the working branch. `main` is production and only changes through a reviewed
  PR from `dev` (or a `release/<slug>` branch).
* Work happens on `feat/<slug>`, `fix/<slug>` or `chore/<slug>`, cut from `dev`, merged
  back by squash PR. Merged branches are deleted.
* Never push to `main`. Never force-push a shared branch.
* A commit message is `type(scope): description`.

## The gate

```bash
bash "$(git rev-parse --show-toplevel)/scripts/gate.sh" > gate.log 2>&1; rc=$?
```

* The exit code is the gate. Branch on `$rc`. Never pipe the gate through `tail`, `head`
  or `grep`: a pipeline reports the last command's status, so a red gate reads green.
* Quote the `GATE_RC=` line from the log as evidence. A summary is not evidence.
* Steps: install, typecheck (named tsconfig), lint (no `any`), unit tests, build, secret
  scan on added lines, branch name, waivers, data dictionary, build-error suppression ban.
* Between slices, `--skip-install` is fine (the header then says SKIP_INSTALL=1). The run
  that gates a merge installs from the lockfile.
* `scripts/prove-gate-fails.sh` plants one defect per step and proves each step goes red.
  A new check gets a new mutation there, or it is decoration.
* CI runs the same two scripts. A green badge is a second source; the log is the record.

## Code standards

* TypeScript strict, `noUncheckedIndexedAccess` on. No `any`; no `@ts-ignore`. A
  justified exception carries a comment with the reason.
* No `ignoreBuildErrors`. The gate fails on it.
* Every function handles errors explicitly. No silent catches: a catch either handles one
  named case or rethrows.
* Functions under 40 lines, files under 300. Extract when exceeding.
* Every API route has a happy-path test and an error-path test.
* Validate all external input at the boundary. Any URL fetched on a user's behalf goes
  through an allow-list (no server-side request forgery).

## Data

* **No table before the record.** A table or column is described in
  `docs/architecture/data-model.md` and has a row in
  `docs/architecture/data-dictionary.yml` before its migration is written. The gate fails
  a migrated column with no row.
* Migrations live in `supabase/migrations/`, created with `npm run db:new <name>`, applied
  with `npm run db:push`. Never change the remote database by hand.
* RLS is switched on automatically for every new `public` table (secure defaults
  migration). With RLS on and no policy, access is denied. Every policy ships with one
  allow check and one deny check.
* Functions are not callable by `anon` or `authenticated` unless granted on purpose, in the
  migration that creates them, with the reason. Definer functions pin `search_path = ''`.
  A policy that calls a function in `private` needs USAGE on the schema as well as EXECUTE.
* `anon` cannot read a new table unless the migration grants it, with the reason.
* Seed data is synthetic only. No real personal data in the repo, ever.

## Secrets

* Secrets live in `.env.local` (local), Vercel environment variables (deployed) and the
  password manager (source of truth). Never in git, never in chat, never in a log.
* `.env.example` lists names only. Docs write `[see .env]` instead of a value.
* The publishable key is public by design. The secret key bypasses RLS: server only,
  `src/lib/supabase/admin.ts`, Production scope only.
* A variable's name decides where it may go: `NEXT_PUBLIC_*` is public (in the browser
  bundle); every other name is server-only, Sensitive, Production only in Vercel
  (`scripts/setup-vercel.mjs` sends it so, `scripts/check-vercel.mjs` checks it).
* Never read, print or copy out a `.env*` file's values (`.env.example` holds names only and
  is fine), and never dump the environment (`env`, `printenv`). Scripts read the file
  themselves and print names only. A value in the transcript is a leaked value.
* A secret that appears anywhere it should not is rotated, not just deleted.

## Verification

* Verify the premise before building: read the actual schema, code or behaviour.
* A probe asserts on an error code or a planted marker, not on an HTTP status alone.
* A deploy is checked by `/api/health` returning the deployed commit SHA, not by a 200.
* A user-facing change is proven by walking it through the rendered UI: steps, what
  happened, build SHA. A suite that never signs in is not evidence a user can sign in.
* A defect found while building gets written down (a card) before it is fixed.
* Anything deferred gets a card before the PR that defers it merges.

## Delivery flow

The stage flow and the tracking board are in `.claude/harness.md`. The time-boxed version
is `docs/process/timeboxed-delivery.md`, run with the `/timebox` command.

## Where things are

| What | Where |
| --- | --- |
| Design pass, critique, copy pass | `docs/design/` |
| Product spec | `docs/specs/` |
| Data model and dictionary | `docs/architecture/` |
| Decisions | `docs/adr/` |
| Reviews | `docs/reviews/` |
| Deploy and incident runbooks | `docs/runbooks/` |
| Waivers (owner + expiry) | `docs/waivers.md` |
| Probe and bootstrap records | `docs/ops/` |
