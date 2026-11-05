# Time-boxed delivery (one hour)

The full stage flow compressed to fit one hour, with nothing skipped silently. Every stage
still happens; the ones folded together are named here, so the compression is a stated
decision and not a shortcut. Run it with `/timebox`.

## Shape

| Minutes | Stage | Output | Gate |
| --- | --- | --- | --- |
| 0-12 (15 at the latest) | Design pass (`/timebox` 6a-6e) | `docs/design/design-pass.md` at `product-design` v2.6.0 Timebox depth: 6a Frame and the five challenges (market fit, differentiation, scalability, user value, timing), why they would pay, what kills it; 6b Define (jobs to be done, assumptions, problem statement, persona, principles, hypothesis, appetite check and cut list); 6c Develop (concept, core flow with the returning-visitor leg, breadboard, user stories); 6d `design-critic` in a fresh context | **Design gate (6e): owner approves the pass** |
| 12-18 | Spec + data model | `docs/specs/product-spec.md`, acceptance criteria from the user stories (edge cases, returning visitor); data model record, dictionary rows, migration; `data-model-reviewer` on any new or changed migration, or any change to `docs/architecture/data-model.md` or the dictionary (tables, columns, policies, functions, views, grants, indexes, triggers) | **Gate 1: owner approves spec + data model** |
| 18-44 | Build | Vertical slices, one sub-task each, in dependency order; the gate after every slice | gate rc per slice |
| 44-47 | Copy pass + review (12b) | `docs/design/copy-pass.md` on every user-facing string; `stage5-reviewer` once on the full feature diff, fresh context, before the PR to `dev` | reviewer APPROVE |
| 47-54 | Deploy | Merge to `main`; production deploy; Playwright smoke against the live URL; `/api/health` SHA equals the merge commit; core flow walked in the browser | **Gate 2: owner approves live** |
| 54-60 | Close | README: product, run, data model, what was cut, known gaps; export the session log unedited | |

## What is folded, and why it is safe for one hour

* Design runs at the `product-design` skill's Timebox depth: every step it keeps is a
  section of `docs/design/design-pass.md`, and every step it skips is listed there with the
  reason (no users are reachable in an hour, so there is no research; one concept, so no
  divergence or scoring). See `docs/design/README.md`.
* Vision, PO scoring and epic scoping fold into the Frame: one product, one owner, one hour.
  The five challenges and "why they would pay" are lines in it.
* Planning and architecture fold into the spec: the data model and the slice list are the
  architecture; a Mermaid diagram is added only if a flow crosses more than two parts.
* Review is not folded away. The design pass is critiqued by `design-critic` before the
  Design gate; the data model by `data-model-reviewer` before Gate 1 on any new or changed
  migration, or any change to `docs/architecture/data-model.md` or the dictionary (tables,
  columns, policies, functions, views, grants, indexes, triggers); the code by
  `stage5-reviewer` once on the full feature diff in serial mode (step 12b), and in lane
  mode per lane before each merge plus once at step 13 on the lead's own commits since the
  branch was cut (the spec, Group 0, changed contracts, Gate 1b contracts, the copy pass),
  which no lane review sees. All of them run in a fresh context, never a fork, and a BLOCK
  is fixed before the gate it precedes.
* Nothing is folded out of the gate. It runs after every slice.

## Scope rules for the hour

* One core workflow, end to end, live. Breadth loses to a finished flow.
* A real data model with real state transitions, not a form over an LLM call.
* Seeded synthetic data so the live demo shows the workflow on first load
  (`supabase/seed.sql`, applied with `npm run db:push:seed`).
* Cut, and say so in the README: anything not on the core flow.

## Tracking

The board is named in `.claude/harness.md`. Notion is updated at each stage change and at
each gate only, one batched update each: Current Stage, Next Action, the checklist box,
the Gate Log line. Slices are created as Sub-tasks at Gate 1.

## Time checks

At minute 12, ask the Design gate: what the pass has not reached by then goes on its cut
list. A critic BLOCK gets one fix and one fresh re-critique; a second BLOCK goes to the owner
at the gate, who cuts the failing part or accepts the finding as a logged bet. The Design
gate closes by minute 15 at the latest. If it runs past minute 12, Gate 1 slips by the same
amount; the build cut (serial 44; lanes 40 and 42), the minute-28 RLS deadline and the lane
hand-back time do not move.

At minute 44 (serial flow; lane mode cuts at 40 and 42, below), whatever is unfinished is
cut, not rushed: copy pass, review, deploy what works. At minute 54 (53 in lane mode), stop
building. The README and the export are part of the deliverable.

## Parallel lanes (optional)

The serial flow above is the default. Lanes are for an hour whose scope splits into two or
three slices that touch disjoint files. Lanes add fixed costs (a worktree, an install, a
gate and a review each), so they pay only when the slices are large. If the operator's dry
run took more than 8 minutes from Gate 1 to the first lane merged, run serial.

### Shape

| Minutes | Lead | Lanes | Gate |
| --- | --- | --- | --- |
| 0-12 | The design pass and its critique, as in the serial flow | none yet | **Design gate** |
| 12-18 | Spec, and the contracts below as one Group 0 commit; fresh-context data-model review on any new or changed migration, or any change to `docs/architecture/data-model.md` or the dictionary (tables, columns, policies, functions, views, grants, indexes, triggers) | none yet | **Gate 1** |
| 18-40 | Apply the migration and run the RLS probe (`scripts/probe-rls.mjs`, green by minute 28); answer BLOCKED handbacks; integrate each approved lane | build to `GATE_RC=0`, then hand back | per lane: gate rc + paths check + reviewer APPROVE |
| 40 | No new lane work. A lane not handed back is cut: Backlog card, README gap | stop | |
| 42 | A lane not APPROVED by now is cut the same way | | |
| 42-53 | `/timebox` step 13 onward: the copy pass, then `stage5-reviewer` on the lead's own commits since the branch was cut, then the full gate, with install, on the integration branch; deploy and Gate 2 as in the serial flow | | **Gate 2** |
| 53-60 | Close, as in the serial flow | | |

### Contracts (approved at Gate 1, before any lane codes)

* `docs/specs/product-spec.md`: acceptance criteria from the design pass's user stories,
  per element with edge cases, and a lanes table (lane, criteria owned, owned paths,
  integration order, cut order).
* `docs/specs/lanes.txt`: the ownership map, one line per lane, `<lane> <glob> ...`
  (`docs/specs/lanes.example.txt` shows the shape). The `lead` lane owns every shared file:
  `package.json`, the lockfile, the root layout, global CSS, `src/lib/contracts/**`,
  `supabase/**` and `docs/architecture/**`. It must own the map itself, the check's
  scripts and the files that change how git diffs and merges (`docs/specs/lanes.txt`,
  `scripts/check-lane-paths.mjs`, `scripts/lib/is-main.mjs`, `scripts/lib/lane-merge.mjs`,
  `.gitmodules`, `.gitattributes`) alone: the check refuses a map that gives them to a
  lane. The check needs git 2.38 or later.
* The data model record, the dictionary rows, the migration, and one allow and one deny
  test per policy (written in that order; the gate checks the dictionary).
* `src/lib/contracts/*.ts`: request and response types for every route, and the validation
  each route runs at its boundary. Lanes import them and never edit them.

The `data-model-reviewer` reviews the record, dictionary, migration and tests in a fresh
context before the owner sees Gate 1, in both modes, on any new or changed migration, or any
change to `docs/architecture/data-model.md` or the dictionary (tables, columns, policies,
functions, views, grants, indexes, triggers). A BLOCK is fixed before any lane starts.

An item scoped after Gate 1 gets **Gate 1b**: its owned paths and route types only, one line
of owner approval, and its lane starts. A Gate 1b that needs a data-model change after
minute 28 is refused: the item is cut instead.

### Lanes

* One writer per worktree, on `feat/<slug>-<lane>`, cut from the Group 0 commit. The lead
  creates each worktree with `git worktree add` so the branch name and base are exact.
* A lane changes only its owned paths, gives every route a happy-path and an error-path
  test, adds no dependency, calls no live API in tests (fixtures only), and never pushes.
  On a contract gap it stops and hands back BLOCKED with the question; it never works
  around the contract.
* A lane hands back at `GATE_RC=0` from its own log, quoting the line, with its head SHA.

### Integration, one lane at a time, in the spec's order

The `<lead worktree>` is the lead's own worktree of `feat/<slug>`, outside the main checkout.

1. `node <lead worktree>/scripts/check-lane-paths.mjs <lane> <lane head SHA>` reads
   `LANE_PATHS_RC=0`. Git computes the merge of the lane into the lead's HEAD
   (`git merge-tree`, no checkout touched), and the check compares every path that merge
   would change against the map in the lead worktree's committed HEAD. Nothing is
   approximated, so no history shape (criss-cross merges, reverts) can hide a change, and
   the map can only be what the lead committed. It prints `diff <lead HEAD> <merge tree>`
   and a change id: the SHA-256 of git's raw diff of that change (every changed path
   with both modes and both blob ids).
2. `stage5-reviewer` reviews that diff in a fresh context, with the lead worktree as its
   `repo` and the change id named in the review, against the lane's criteria and
   `docs/reviews/lenses.md`. Reviews of different lanes may run at once.
3. On APPROVE: merge with the check's `--merge <reviewed change id>`, never with a bare
   `git merge`. It re-checks at the current HEAD and refuses unless the change the merge
   brings in is still exactly the reviewed change (another lane may have merged since).
   Then it merges into the worktree and asserts the staged tree is the checked tree. It
   builds the commit itself from the checked tree and the two checked parents
   (`git commit-tree`, signed when `commit.gpgSign` is set), and moves the branch only if
   it still points at the checked lead HEAD (`git update-ref` with the old value), so
   neither a hook nor another writer can change what is recorded. Every git call it makes
   also runs with repo hooks off (`core.hooksPath=/dev/null`); the gate re-run below does
   what a hook would check. A failed commit or a moved branch is refused: nothing is
   recorded unless the line says `MERGED` (or "merged as"), and when HEAD is no longer the
   checked lead HEAD the line says where it is. A reset is named only while HEAD is still
   the checked lead HEAD, and then as `git reset --hard HEAD`; first clear whatever git's
   quoted error names (a held lock, say), or the reset fails the same way. When another
   writer moved the branch, the check says not to reset. It refuses a HEAD that is not on
   a branch. Run
   one `--merge` at a time per lead worktree, and never retry one before its output is
   read. Only `MERGED <sha>`, which names the tree and both parents, means merged; rc 2
   always needs the operator to read the line. Re-run the gate, quote the line, then remove
   the lane's worktree and delete its branch.
4. On BLOCK: the same writer fixes the findings only; the check and a new reviewer run on
   its new head SHA. A second BLOCK cuts the lane.
5. A merge that would conflict fails the check. The lane rebases onto `feat/<slug>`,
   resolves inside its own paths, and hands back again; the lead never resolves a lane's
   conflict, so every merged line has passed the check and a review.

Changes after Gate 1 are the lead's commits on `feat/<slug>`, each re-gated:

* A data-model change (any new or changed migration, or any change to
  `docs/architecture/data-model.md` or the dictionary (tables, columns, policies, functions,
  views, grants, indexes, triggers)) needs the owner's yes and a fresh `data-model-reviewer`
  APPROVE, and is applied and probed live again. After minute 28 it is refused, and the item
  is cut.
* A changed contract file: each lane that imports it rebases its own worktree onto the new
  commit before it continues (the lead tells it; the lead never runs git in a lane's
  worktree).
* A Gate 1b adds the new item's contract files and one new line in `lanes.txt`. It changes
  no existing lane's line or contract file, so no running lane rebases.
* A changed `lanes.txt` line applies at once, because the check reads the lead's HEAD.
