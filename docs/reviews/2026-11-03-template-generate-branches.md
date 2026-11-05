# Review: generated-repo branches (TEMPLATE-3)

Independent review by the `stage5-reviewer` agent (fresh context) of `origin/dev...4de26c0`,
spec `docs/bugs/2026-11-03-template-generate-branches.md`, lenses COMMON 1-6 (the template has
no registered profile). Verdict: **APPROVE**. Every B4 criterion was verified; the reviewer re-ran
both tests red on the old scripts (5 failed, 3 passed) and green on the new, and killed four
mutants (no merge-base check, no release preference, branch lookup decided on output, compare
decided on output). No S2 or S3.

## Findings and resolutions

* **S1 `bootstrap-repo.sh` compare: every failure read as "share no history, regenerate".** A
  401/403, rate limit or network error would recommend a destructive remedy for a transient
  fault. **Resolved:** "regenerate" only when gh's stderr says `No common ancestor` (measured
  live: `gh: No common ancestor between main and dev. (HTTP 404)`); any other failure records
  `could not compare main and dev: <gh's message>`. Test: rate-limited compare.
* **S1 branch lookup hid auth and network errors.** An unauthenticated run would record "neither
  main nor dev exists". **Resolved:** a branch is missing only on `(HTTP 404)` in stderr
  (measured live: `gh: Not Found (HTTP 404)`); anything else stops with gh's message. Test:
  `gh: Bad credentials (HTTP 401)`.
* **S1 failed branch creation left the record row without a note.** **Resolved:** the note says
  `could not create <branch> from <branch>: <gh's message>`. Test: HTTP 422 on create, with the
  record row checked.
* **S1 the prove leg cannot tell the new check from the old diff failure.** Accepted on record:
  the step goes red either way (fail-closed both before and after), and the named reason is
  pinned by `tests/unit/scripts/gate-base.test.ts` ("a base with no common history fails closed
  and says why"). The leg's description now says so.
* **S1 live probe sequenced after the release to `main`.** Correct: a generate copies the default
  branch, `dev`, so the probe runs as soon as this merges to `dev`. The plan in the bug record
  is amended.
* **S0 no test for "neither branch" or a failed create.** Both added.
* **S0 `origin/main` listed twice in the release candidate list.** Harmless; left.
* **S0 the stand-in still answers `branches/<name>` (old `ensure_dev` only).** Kept: the red
  run against the old script needs it.

The three new error-path tests fail on the pre-resolution script (3 failed, 5 passed) and pass
on the resolved one (12 passed with the gate-base suite).

## Questions answered

* **Card for the live probe.** It is a B6/B8 leg of TEMPLATE-3 itself, recorded on the card's
  Gate Log when it runs; the epic does not close until it has.
* **B4 approval.** Recorded separately: "Approve both plans" (Sat, 2026-11-03), in the card's Gate
  Log.
