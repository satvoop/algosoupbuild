# Deploy runbook

## First-time setup (once per project)

1. **Repo.** "Use this template" with "Include all branches" OFF (or
   `gh repo create <owner>/<name> --private --template satvoop/enterprise-template`), then
   `bash scripts/bootstrap-repo.sh --repo <owner>/<name>` and read the record it writes in
   `docs/ops/`. The template's default branch is `dev`, so only `dev` is copied; bootstrap
   creates `main` from it, so the two share history (the release flow and the gate need that).
   A repo made with all branches has two unrelated roots: bootstrap stops, and the fix is to
   regenerate.
2. **Supabase.** Create the project in the dashboard (region: London `eu-west-2` for UK
   data). Free tier for a demo only; production needs Pro (daily backups, no pausing,
   leaked-password protection, spend cap). Then:
   * `./node_modules/.bin/supabase login` and `./node_modules/.bin/supabase link --project-ref <ref>`
   * `npm run db:push` to apply the migrations, including the secure defaults
     (`npm run db:push:seed` to also load the synthetic seed into a demo project).
   * Auth: set Site URL and the redirect allow-list to the Vercel domains; custom SMTP
     before any real user (the built-in sender only reaches project members, a few per hour).
   * Use the publishable and secret keys (`sb_publishable_` / `sb_secret_`), not the legacy
     anon / service_role keys.
3. **Local.** `cp .env.example .env.local`, fill it from the password manager.
4. **Vercel.** Run this after step 3 (it reads every variable in `.env.local`) and
   **before pushing any branch**. Vercel
   makes a new project's first deployment production, whatever branch it comes from
   ([docs](https://vercel.com/docs/deployments/environments)); a first push of a feature
   branch would go live on the public production URL unreviewed.
   * `node scripts/setup-vercel.mjs --repo <owner>/<name> --scope <team> --vars-file .env.local`
     (signed-in Vercel CLI on the PATH, or `VERCEL_BIN=<path>`). It creates the project with
     the repo connected, sets Standard protection (previews behind Vercel login, production
     public) and the Node major from `.nvmrc`, adds every variable in the file, then makes the
     FIRST deployment from `main` and waits for it. Each step's rc goes to
     `docs/ops/vercel-<date>.md` (appended per run); commit it.
   * If it stops with `STOP: the project exists without a main deployment`, push NO branch,
     fix the named cause and re-run it: it resumes a project that has no production
     deployment, and refuses one that already has (then use `check-vercel.mjs`).
   * Where a variable goes is set by its NAME (`scripts/lib/vars-file.mjs`): `NEXT_PUBLIC_*`
     is inlined into the browser bundle, so it goes plain to Production, Preview and
     Development; every other name is server-only and goes as **Sensitive, Production only**
     (write-only: nobody, the agent included, can read it back from Vercel). An entry already
     stored another way is corrected in place (PATCH). The CLI refuses deletes
     non-interactively, so a key with an entry that cannot be corrected in place (a second
     entry, a branch scope or custom-environment sync on a server key, a public key stored
     Sensitive) stops the run before anything is written and is named, with any rotation
     advice: fix or remove that entry in the dashboard and re-run. A public entry scoped to a
     branch or synced to a custom environment is a deliberate override and is left alone.
     `VERCEL_*` names are refused. A multi-line credential (a PEM key) goes in base64 on one
     line and is decoded server-side.
   * Add or rotate a key later: put it in `.env.local`, then
     `node scripts/setup-vercel.mjs --repo <owner>/<name> --scope <team> --vars-file .env.local --env-only`
     (variables only; the value reaches production on the next deployment of `main`). Every
     value in the file is sent, so `.env.local` must hold PRODUCTION values; add
     `--keys NAME1,NAME2` to send only those. A server key found stored readable is corrected
     and flagged `ROTATE`: rotate it at its provider. A public key deliberately split
     over several entries in Vercel (say, a different Preview value) is kept and not rewritten
     (`kept: split`); naming it in `--keys` is refused. Change such a key in the dashboard.
   * Confirm: `node scripts/check-vercel.mjs --project <name> --scope <team> --vars-file .env.local` must print
     `CHECK_RC=0`, then `/api/health` on the production domain returns `main`'s head SHA.
   * One Node major everywhere: `.nvmrc` (CI) and `engines.node` (Vercel builds with it,
     overriding the project setting) must name the same major; a unit test enforces it.
   * Do not run `vercel link` in the repo. It appends `.env*` to `.gitignore` (which hides
     `.env.example` changes) and writes a live `VERCEL_OIDC_TOKEN` into `.env.local`. If it was
     run, `git checkout -- .gitignore` and delete the `VERCEL_OIDC_TOKEN` line from `.env.local`.
   * `SUPABASE_SECRET_KEY`, when a feature needs it: put it in `.env.local` and the script
     sends it Sensitive, Production only. Do not let an integration copy the database password
     into Preview or Development.
   * Create a Protection Bypass for Automation secret before running E2E against previews.
   * Spend management: set a budget AND turn on "Pause production deployments"; a budget
     alone stops nothing.

## Every release

1. Feature PR into `dev`: gate green in CI and locally, `GATE_RC=0` quoted in the PR body.
2. `bash "$PWD/scripts/release.sh" <slug>` opens a PR from `release/<slug>` (cut from
   `main`, carrying `dev`'s exact tree) to `main`. A direct `dev` -> `main` PR conflicts after
   the first squash release, which is why this exists. Merge by squash, server-side, with
   the head SHA read from the PR:
   `gh api -X PUT repos/<o>/<r>/pulls/<n>/merge -f merge_method=squash -f sha="$(gh pr view <n> --json headRefOid --jq .headRefOid)"`
3. Confirm the merge by state: `gh pr view <n> --json state,mergedAt`.
4. Confirm the deploy by content, not status:
   `curl -s https://<domain>/api/health` returns the merge commit SHA.
5. Smoke against live:
   `BASE_URL=https://<domain> EXPECTED_SHA=<sha> ./node_modules/.bin/playwright test`
6. Walk the core flow in a browser. Record steps and SHA in the PR.

## A migration the new code depends on

Ship it alone first, apply it, probe it live (the new column answers, the policy denies what
it should), then ship the code. Vercel and Supabase do not deploy together.

## Content Security Policy

The CSP is enforced on production builds. It allows `'unsafe-inline'` scripts because
Next.js emits inline hydration scripts; removing that needs a nonce-based policy (a proxy
that sets a per-request nonce, per the Next.js CSP guide), which also makes every page
dynamic. Do that as its own change, with the smoke test, which fails on any CSP violation.
When the product calls a new origin (an API, a CDN, analytics), add it to `connect-src`,
`img-src` or `script-src` in `next.config.ts` in the same PR.

## Extensions the local check cannot load

The gate's dictionary check applies every migration to an in-process Postgres, which bundles
the standard contrib extensions (pgcrypto, uuid-ossp, citext, pg_trgm, btree_gist and the
rest) but NOT vector, pg_net, pg_graphql, pgjwt, supabase_vault or pg_cron. A migration that
creates one of those fails the check closed, and that is the right default: the check cannot
see what the migration does. If a product genuinely needs one (pgvector for embeddings is
the likely case), do not edit the check to skip it. Decide first, then:
* keep the extension's objects out of the tables that hold personal data, and
* record a waiver (owner, expiry) and the deferred work as a card, and
* move the dictionary check for that migration to a real Postgres with the extension
  (the CI `db-defaults` service pattern) before the waiver expires.

## Probing the database secure defaults on a live project

After `npm run db:push`, an anonymous read of a new table must fail with
`42501 permission denied`, not return `[]`: with RLS on and no policy, `[]` is what you get
whether or not the anon grant was revoked, so `[]` proves nothing about the revoke. If the push
fails on the event trigger (hosted Postgres restricts event triggers to permitted
roles), record it in `docs/ops/` and enable RLS explicitly in each table's migration until
it is resolved.

That alone does not prove RLS: the revoked grant refuses anon whether RLS is on or not, and
the gate's database tests run on a local model of Supabase, not the hosted project. So each
new table is probed live with
`node scripts/probe-rls.mjs --table <table> --owner-column <column> --marker-column <column>`
(`--row '<json>'` for its other required columns, `--anon read` for a table granted to anon
on purpose). It creates two users and one planted row for the run and checks four legs:
anon refused with `42501 permission denied for table <table>`; the owner sees its planted
row; a second, unrelated user sees none, with no error; and the row and users are removed
and read back as gone. Together the owner and stranger legs show RLS is on and that an
unrelated new user cannot read the owner's row (PostgREST cannot read `pg_class`: RLS off
with a select grant fails the stranger leg, and no grant fails the owner leg). They do not
prove the policy is owner-only for every relationship: a policy that also admits, say, members
of the owner's organisation passes, because the stranger has none. It probes reads only.

It reads `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
`SUPABASE_SECRET_KEY` from `.env.probe` (gitignored; `--vars-file` for another file), and
prints names, never values. Keep the secret key out of `.env.local`: `setup-vercel.mjs` sends
every name in that file to Vercel Production. The probe writes to the target project: it
creates two auth users and one row, so Auth hooks and database webhooks on `auth.users` or
the table fire, and its cleanup does not undo their effects. Quote its last line,
`RLS_PROBE_RC=0`.
