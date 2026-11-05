# Review lenses

The checks a fresh-context reviewer (`.claude/agents/stage5-reviewer.md`) runs on a diff in
this repo. Each lens is PASS, FAIL with file:line, or N/A with the reason. A skipped lens is
a FAIL. Run by the author before a review, this is a pre-check: it does not count as the
review.

Severity: S3 blocks the merge; S2 needs an owner and a date before merge; S1 is fixed in this
PR; S0 is a note.

## L1. The gate

* The `GATE_RC=` line is quoted from the gate's own log, with its header line
  (`GATE_TREE=... BRANCH=... SKIP_INSTALL=...`). The tree in the header is the tree under
  review. A summary in place of the line is S2; no line at all is S3.
* **`GATE_RC` other than 0 is BLOCK.** Stop and report; do not review further.
* The run that gates a PR's merge has `SKIP_INSTALL=0`. A lane's handback gate may skip the
  install, because the lead installed in the lane's worktree when it was created; the lead's
  final gate before the PR installs.

## L2. Secrets

* No secret on an added line (the gate's `secrets` step, quoted). No value from `.env*` in
  code, docs, tests, fixtures or logs. Docs write `[see .env]`.
* A server-only variable (any name without `NEXT_PUBLIC_`) is never read in a client
  component or shipped to the browser.
* **Any secret on an added line is BLOCK**, and the value is rotated, not just removed.

## L3. Branch

* The branch is `feat/*`, `fix/*`, `chore/*` or `release/*`, never `main`. The PR targets
  `dev`, or `main` from a `release/*` branch only.
* **A feature branch targeting `main` is BLOCK.**

## L4. Tests

* Every new or changed API route has a happy-path test and an error-path test.
* Every new function with a branch has a test that takes each branch.
* For each new test: what makes it fail? A test that cannot fail, or that asserts on source
  text instead of behaviour, is S2.
* What does each test mock? A test that mocks the seam under test is not evidence the seam
  works. If every layer mocks the same seam (the auth client, the provider call, the sign-in
  form), name that seam UNTESTED, whatever the counts say.
* Tests call no live third-party API. Provider responses come from fixtures.

## L5. Code quality

* No `any`, no `@ts-ignore`, no `ignoreBuildErrors`. A justified exception has a comment.
* Every error path is handled explicitly. A catch handles one named case or rethrows.
* External input is validated at the boundary. A URL fetched on a user's behalf goes
  through an allow-list.
* Functions under 40 lines, files under 300. Names say what a thing is.
* No TODO without a card reference.
* Simplicity: where a flag, a layer or a special case was added and removing something would
  do, say what could be removed (S1).

## L6. Data model

Whenever the diff has any new or changed migration, or any change to
`docs/architecture/data-model.md` or the dictionary (tables, columns, policies, functions,
views, grants, indexes, triggers), walk D1-D12 in `docs/architecture/review-checklist.md`,
in order, with the deterministic line quoted where the row has one.

## L7. Lanes (a parallel build only)

* `node <lead worktree>/scripts/check-lane-paths.mjs <lane> <lane head SHA>` reads
  `LANE_PATHS_RC=0`, quoted, run from the lead worktree. The `diff <lead HEAD> <merge tree>`
  it prints is the diff under review, and its map line reads `(lead HEAD)`, not a `--map`
  override. The review names the printed change id; the lane is merged only by
  `--merge <that id>`, which refuses any other change.
* The lane did not edit a contract (`src/lib/contracts/**`), a migration, the lockfile or
  `package.json`. A route's request and response match its contract type.
* Every acceptance criterion the spec's lanes table gives this lane is met. One that is not
  met is BLOCK, unless the lead has recorded it as cut (a Backlog card and a README gap), and
  the review cites that record.
