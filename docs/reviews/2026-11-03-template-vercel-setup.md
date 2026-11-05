# Review: scripted Vercel setup (TEMPLATE-4)

Independent review by the `stage5-reviewer` agent (fresh context) of `origin/dev...c30e888`,
spec `docs/bugs/2026-11-03-template-vercel-setup.md`, lenses COMMON 1-6. Verdict: **APPROVE**,
with one S2 needing an owner and date before merge and the S1s to fix in this PR. All are
resolved here instead.

## Findings and resolutions

* **S2: a failure after create left a git-connected project with no deployment, and a re-run
  died on 409.** In that state the next branch push becomes production, which is the original
  defect by another route. **Resolved:**
  * Every local check now runs before the first API call: the Node pins, the values, the
    arguments and the poll interval.
  * The script reads the project first. A missing project (404) is created. A project with no
    production deployment is resumed. A project that already has one is refused.
  * On any failure after create, the script prints `STOP: ... Push NO branch ... re-run this
    script: it resumes`, and the runbook says the same.
  * Live: a fresh project was created end to end, and a project whose production came from a
    branch was refused with no writes.
* **S1: `.nvmrc` not validated before step 1.** Resolved: `nodePinProblems` runs in preflight.
  Test: "engines and .nvmrc disagree" makes no calls.
* **S1: the env API's `failed` array was ignored.** Resolved: any non-empty `failed` stops the
  run, recording only the error codes. Test: ENV_CONFLICT inside a 201.
* **S1: quotes and inline comments kept in values.** Resolved: matching quotes are stripped, as
  dotenv does, and a value with whitespace or `#` left in it is refused. Tests for both.
* **S1: a wait failure was not recorded; a same-day re-run truncated the record.** Resolved: the
  wait outcome is recorded either way, and runs append under their own header. Test: deployment
  ERROR.
* **S1: error text carried CLI stdout, which can echo values.** Resolved:
  * Errors use stderr only. Measured on CLI 64.7.0: HTTP errors print nothing on stdout and
    `Error: <message> (<status>)` on stderr.
  * Known values are also redacted from every recorded or printed note.
  * Test: a `failed` item that echoes the value leaks nothing.
* **S1: the check passed a production deployment that was not READY.** Resolved: `readyState`
  must be `READY`. Measured: `targets.production` carries `readyState`.
* **S1: the runbook used `.env.local` a step before creating it.** Resolved: Local is now step 3
  and Vercel step 4.
* **S0s.**
  * Fixed: the project name is validated and encoded in paths; `VERCEL_POLL_MS` is validated; the
    CLI call has a 120s timeout; "delete that line" now names `VERCEL_OIDC_TOKEN`.
  * Accepted: the connect-to-first-deploy window (covered by "before pushing any branch"), and the
    hand-written `.d.mts`, which mirrors the `.mjs` and is checked by typecheck at use.

New finding while fixing: Node 24.22.1 reads `--env-file` even after the script name and exits 9
if the file is missing, before the script runs (measured). The option is renamed `--vars-file`.

## Red and green

Against the pre-review scripts the new and changed tests give 14 failed, 9 passed. Several of
those fail on the renamed flag and the new first GET, as well as on the behaviour each names, so
this shows the suite is not vacuous rather than isolating each case. After: 23 passed.

## Questions answered

* `vercel api` on a 4xx: exit 1, stdout empty, `Error: Project not found. (404)` /
  `Error: Project "x" already exists. (409)` on stderr (measured).
* The live setup records were moved to the session scratchpad (they describe the dry-run repo,
  not the template).
* Probe projects: the three throwaway Vercel projects are on
  the dry-run cleanup list that waits for Sat's OK.
