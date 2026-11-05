# BUG P1: a repo generated from the template cannot release cleanly

Card: TEMPLATE-3 (the template maintainer's board). Full path (P1 by class escalation; B1 approved by Sat
2026-11-03, "Approve all three").

## B1 Capture

* **Symptom 1 (original TEMPLATE-3).** The template's default branch is `dev`. "Use this template"
  (and `gh repo create --template` without `--include-all-branches`) copies only the default
  branch, so a generated repo has `dev` and no `main`. `bootstrap-repo.sh` only ever creates
  `dev` from `main`; nothing creates `main`, and the ruleset step for `main` targets a branch
  that does not exist.
* **Symptom 2 (found in the dry run).** The remedy recorded for symptom 1 on 2026-11-03 was to
  generate with `--include-all-branches`. That gives `main` and `dev` separate root commits
  (`satvoop/enterprise-template-dryrun`: main `446cfa2` parents none, dev `b0979ba` parents
  none). `gate.sh` takes `origin/dev` as the local base on every branch, so on `release/dryrun-1`
  the secret scan printed `FAIL  git diff against origin/dev failed` and `GATE_RC=1` (tree
  8107f5c). Against the PR base it passed (`GATE_BASE=origin/main`, `GATE_RC=0`).
* **Measured API behaviour** (2026-11-03): `gh api repos/<r>/compare/main...dev` on the dry-run
  repo returns HTTP 404 "No common ancestor between main and dev." and prints that body on
  stdout even with `--jq`; on the template it returns 200 with a merge base. A missing branch is
  a non-zero exit.
* **Build.** Template `dev` at 5f0092a.

## B2 Reproduce

Two new tests, run against the unfixed scripts: 5 failed, 3 passed.

`tests/unit/scripts/gate-base.test.ts` (throwaway git repo, separate main and dev roots):
* release branch: header did not contain `BASE=origin/main` (it used origin/dev and failed).
* a key committed on a release branch: no `FAIL  potential secret material` (the scan died on
  the diff before it could look, so a leak and a clean release read the same).
* a base with no common history: no "no common ancestor with origin/main" message.
* feature branch against dev: passed (guard).

`tests/unit/scripts/bootstrap-branches.test.ts` (stand-in `gh` replaying the measured answers):
* dev only: no `POST git/refs` for `refs/heads/main`.
* main and dev with no shared history: bootstrap carried on (`STEP dev branch rc=0`) instead of
  stopping.
* main only, and shared history: passed (guards).

## B3 Root cause and blast radius

* **5 Whys.** The release gate failed -> its base shares no history with the branch -> `main`
  and `dev` were created as two roots -> the generation remedy copied both branches as separate
  roots -> the remedy was written from the symptom ("no main") without checking what
  `--include-all-branches` produces -> nothing in the template creates `main` from `dev`, and
  nothing checked that the two share history.
* **Barrier analysis.**
  * Unit tests: none exercised `base_ref()` or bootstrap. Now both are covered.
  * Gate proof (`prove-gate-fails.sh`): every sandbox is one root on `dev`, so a second root never
    appears. A leg for "base with no common history" is added.
  * Review: the initial review checked the gate inside the template, where `main` was cut from
    `dev`, so the shape never existed there.
  * CI: PRs pass `GATE_BASE` as the PR base, which hides the local failure.
  * Dry run: caught it, which is what it is for.
* **Class sweep.**
  * `grep -rn 'origin/dev|origin/main|...HEAD|merge-base|GATE_BASE'` over scripts, CI and docs.
  * `ci.yml`: PRs set the base; pushes run only on `dev`. Not a sibling.
  * `release.sh`: cuts from `origin/main` and checks the tree against `origin/dev`. Unaffected by
    shared roots, and correct once they are shared.
  * `prove-gate-fails.sh` sets `origin/dev` in single-root sandboxes. Not a sibling.
  * Docs that name the generation step: `README.md:44`, `docs/runbooks/deploy.md:5` and the
    bootstrap header. All name "Use this template" and none names the flag, so they are correct
    once bootstrap creates `main`. They are amended to say not to include all branches.
* **Class.** Contract violation (an undocumented assumption that `main` and `dev` share history),
  plus a remedy recorded without verification.

## B4 Fix plan

* **Minimum.** `base_ref()` picks `origin/main` for `release/*`. The release gate passes, but a
  repo with no `main` is still broken, and two roots remain possible.
* **Recommended (this plan).**
  * `gate.sh`:
    * `release/*` takes `origin/main` as its local base;
    * the scan checks `git merge-base` first and fails closed with "no common ancestor with
      <base>", plus where to look.
  * `bootstrap-repo.sh`, a new `ensure_branches` step (core: it stops the script on failure):
    * dev only: create `main` from `dev`;
    * main only: create `dev` from `main`;
    * both: require a merge base from the compare API, else stop before any setting changes.
  * Docs (README, runbook, bootstrap header): generate without "Include all branches". Bootstrap
    makes `main` from `dev`.
  * `prove-gate-fails.sh`: a new secrets leg, "a base with no common history".
  * The two tests above.
* **Maximum.** Also repair two-root repos automatically by re-pointing `main` at `dev`. Rejected:
  it force-updates `main` through the API, and a repo in that state is regenerated in seconds.
* **Rollback.** `git revert` of the squash. No migration, no data, no flag.
* **Risks.**
  * Local runs on `release/*` now scan what the release adds to `main`, the same base CI uses, so
    a release gate that passed before (it never did on a generated repo) reads the same.
  * An existing repo with two roots now stops at bootstrap with a message, which is the intended
    behaviour.
* **Live probe.** As soon as this merges to `dev` (a generate copies the default branch, `dev`, so
  the fixed bootstrap reaches new repos from then on):
  * generate a throwaway repo with a plain `gh repo create --template`;
  * run bootstrap;
  * read `compare/main...dev` (expect 200 with a merge base);
  * cut a release, and gate it locally (expect `GATE_RC=0` with `BASE=origin/main`).
  
  This reaches `ensure_branches` and the new `base_ref()`. Side effect: one throwaway GitHub repo,
  deleted with Sat's OK.
