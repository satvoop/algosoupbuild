# BUG P1: a new project's first branch push goes live on the production URL before review

Card: TEMPLATE-4 (the template maintainer's board). Full path (P1; B1 approved by Sat 2026-11-03).

## B1 Capture

Found in the template dry run (2026-11-03). The template's `dev` was at 5f0092a, the generated
repo was `satvoop/enterprise-template-dryrun`, and the project was created with Vercel CLI 64.7.0
(`vercel link --yes`).

1. **The first deployment went to production.** The first git push was `release/dryrun-1`
   (8107f5c, unmerged). It built with target=production, and the public production domain served
   it (`/api/health` sha=8107f5c) although productionBranch was `main`.
2. **Production built on a Node major that CI never tests.** `engines.node` is `>=22 <25`,
   `.nvmrc` and CI are 22, and the project setting defaulted to 26.x. The build log says:
   "Due to "engines": { "node": ">=22 <25" } ... the Node.js Version defined in your Project
   Settings ("22.x") will not apply, Node.js Version "24.x" will be used instead."
3. **Protection defaulted to `all_except_custom_domains`.** That put the production `vercel.app`
   URL behind a Vercel login, so assessors could not open the live link.
4. **`vercel link` changed local files.** It appended `.env*` to `.gitignore`, which overrides
   `!.env.example`, and wrote a live `VERCEL_OIDC_TOKEN` into `.env.local`.
5. **The runbook did not cover any of this.** Its Vercel section describes a dashboard import.

## B2 Reproduce

Reproduced live in the dry run; the probe log legs V1-V9 record every item with its read-back.
Vercel's own documentation confirms item 1 as designed behaviour
(https://vercel.com/docs/deployments/environments, "First deployment"): "The first deployment of
a new project is always a **production** deployment. This happens even when you: ... Deploy from
a branch that is not your production branch", and "A failed, errored, or canceled first
deployment still counts." It confirms item 2's precedence
(https://vercel.com/docs/functions/runtimes/node-js/node-js-versions): `engines#node` "override[s]
the one you have selected in the Project Settings", and new projects default to the latest LTS,
26.x.

The regression test is the new read-back check, `scripts/check-vercel.mjs`. At B6 it is run
against a freshly created project, before setup (expected red on each item) and after (green).

## B3 Root cause and blast radius

* **5 Whys.**
  * Unreviewed code went live, because the first deployment of a project is always production.
  * The template gave no way to make that first deployment `main`.
  * Vercel setup was a manual dashboard import with no script and no read-back.
  * The runbook was written from the dashboard flow, without reading Vercel's documented rules for
    first deploys, protection and Node version.
* **Barrier analysis.**
  * Unit tests and types: no Vercel code existed to test.
  * The smoke test checks the live SHA. It would catch a wrong SHA after a release, but nothing
    runs it before the first release.
  * Review: the runbook was reviewed as prose.
  * CI: Vercel is outside CI.
  * The dry run caught all five items, which is what it is for.
* **Class sweep.** Vercel-dependent statements in the repo:
  * `docs/runbooks/deploy.md` steps 3 and 4;
  * `.claude/harness.md` deploy_steps;
  * `playwright.config.ts` (bypass header);
  * `next.config.ts` (CSP allows `https://vercel.live`);
  * `src/app/api/health/route.ts` (`VERCEL_GIT_COMMIT_SHA`).
  
  Only the runbook and the harness assume a setup state. The other three read Vercel facts that
  the dry run confirmed. The Node pin is repeated in `.nvmrc`, `package.json` engines and both CI
  jobs (`node-version-file`).
* **Class.** Config drift between the platform and the repo, plus a manual setup with no
  read-back.

## B4 Fix plan

* **Minimum.** Runbook text: deploy `main` first, set protection, pin Node.
* **Recommended (this plan).**
  * `scripts/setup-vercel.sh --repo <o>/<r> [--scope <team>]`. It uses `vercel api` only, so it
    never runs `vercel link` and writes no local files:
    1. create the project with its git repository;
    2. set protection to Standard (`prod_deployment_urls_and_all_previews`) and the Node version
       to the `.nvmrc` major;
    3. add the two public variables from a local env file named by the caller;
    4. create the FIRST deployment from `main` through the git source, before any branch push;
    5. record each step's rc in `docs/ops/vercel-<date>.md`.
  * `scripts/check-vercel.mjs`, a read-back that exits non-zero on any miss:
    * productionBranch `main`;
    * protection Standard;
    * the project Node version equals the `.nvmrc` major, and `engines.node` resolves to the same
      major;
    * both public variables present;
    * the production target's git ref is `main`.
    
    Unit tests use recorded API JSON, including the dry-run defaults, which must go red.
  * One Node major everywhere: `.nvmrc` 24, `engines.node` `24.x`, Vercel 24.x. Node 24 is the
    LTS this server runs and what Vercel built with. CI reads `.nvmrc`. A unit test asserts that
    `.nvmrc` and the `engines` major agree.
  * Runbook step 3 and the harness deploy_steps rewritten around the two scripts. A note covers
    `vercel link`'s side effects, for anyone who links later.
* **Maximum.** Also script the Supabase half (TEMPLATE-6) and the spend controls. Deferred:
  TEMPLATE-6 has its card, and spend controls are dashboard-only on Hobby.
* **Rollback.** `git revert`. The scripts only act when run. Projects already set up are
  untouched.
* **Risks.**
  * Moving CI from Node 22 to 24 could surface a difference. Mitigation: the full gate runs locally
    on 24 already (this server), and CI runs on the next PR once CI-1 is fixed.
  * The deployment-creation API shape needs reading from Vercel's API reference before writing
    step 4. That's a B6 task, cited in the script.
* **Live probe (B6).**
  1. Create a throwaway project on the dry-run repo with `setup-vercel.sh`.
  2. Run `check-vercel.mjs` against a second throwaway project created bare, to see it go red on
     the defaults.
  3. Run it against the scripted project: expect green, with the first deployment's ref `main`
     and its `/api/health` SHA equal to `main`'s head.
  4. Push a branch and confirm it is a preview.

  Side effect: two throwaway Vercel projects, deleted with Sat's OK.

## B6 Live probe (2026-11-03, Vercel CLI 64.7.0, a throwaway dry-run repo and team)

* `setup-vercel.mjs` on throwaway project A: create, node 24.x, both env, first
  deployment (main) all `rc=0`; first deployment READY.
* `check-vercel.mjs` on it: `PASS ... main in production, Standard protection, Node 24.x, public
  env set`, `CHECK_RC=0`. Production `/api/health` sha `28486fc...` = `main` head `28486fc...`.
* A bare throwaway project B (created the plain way): `CHECK_RC=1` with all five misses
  (protection `all_except_custom_domains`, Node `26.x`, both variables missing, no production
  deployment). The check goes red on a real default project, not only on the recorded fixture.
* A branch push with a new commit (`chore/preview-probe-3`, 17b99b0) built with target null
  (preview); production stayed on `28486fc`. Probe branch deleted.
* Both probe projects to be deleted with Sat's OK.

## B6 re-run after review (resumable script)

* Fresh throwaway project C: the real CLI's 404 on the lookup led to create. All
  steps `rc=0`; check `CHECK_RC=0`; production `/api/health` `28486fc...` = `main` head.
* Refusal: `--project <B>` (production from `chore/preview-probe-3`, a branch-first
  project) stopped with "project already has a production deployment (ref
  'chore/preview-probe-3')" and made no writes.
