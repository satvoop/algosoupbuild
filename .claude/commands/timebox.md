Run the one-hour time-boxed delivery for this repo. Follow `docs/process/timeboxed-delivery.md`
exactly; the project facts (board, gate command, deploy steps) are in `.claude/harness.md`.

The board's four epic cards map to the stages (E1 carries the design pass and the spec):
E1 "Frame and spec" | E2 "Data model (Group 0)" | E3 "Deploy and live smoke" | E4 "README, scope notes, export".

## Start (minute 0)

1. Record the start time once: `date -u +%Y-%m-%dT%H:%M:%SZ`, and write it into E1's Owner
   line. Every later step computes elapsed minutes from it with `date` and states the number
   at each gate. Minute 0 is when the owner starts the clock, which is this step.
2. Read `CLAUDE.md` and `.claude/harness.md` in full.
3. Fetch the Tasks data source named in the `notion` slot or, when the slot holds
   placeholders (a public repo), the one named in the operator's local config. Read ONLY
   that data source and the Sub-tasks data source. Never search the wider workspace.
4. Claim E1 (Owner: this session, branch, start time) and set it to Spec / In Progress.
5. `git status` and `git worktree list`. Clean tree on `dev`, then cut `feat/<slug>` from
   `origin/dev`. Run `npm ci` once now.

## Design pass + spec + data model (minutes 0-18)

6. The lean design pass, then the spec. Fill `docs/design/design-pass.md` in place (the
   template, at `product-design` v2.6.0 Timebox depth) from the owner's brief; each section
   names its full-skill step, and section 17 already lists the steps that do not run.
   6a. **Frame + the five challenges (minutes 0-3).** Section 1: the question, the appetite
       (one hour), the decider, the modules and the data depth line, the four risks, the
       hard constraints, what is not researched, the inputs on hand; one line each. Then
       the five challenges, one line each: market fit, differentiation, scalability, user
       value, timing; why they would pay; what kills it; the two `stage0_extra` questions.
   6b. **Define (minutes 3-6).** Sections 2-8: jobs to be done (three layers and the job
       statement), assumptions with the riskiest marked as accepted bets, the problem
       statement (a need, not a solution), one persona, three principles in tension, one
       hypothesis with its signal, the appetite check and the cut list (each cut a Backlog
       card).
   6c. **Develop (minutes 6-9).** Sections 9-14: one concept with "why it might fail", the
       core flow with the returning-visitor leg, a breadboard of the key screens (purpose,
       key elements, primary action, data shown, entry and exit), the entities the screens
       show, the selected modules, and one user story per flow step (Given/when/then, "Feels
       like <principle>").
   6d. **Critique (minutes 9-11).** Commit the pass, then dispatch `design-critic` (fresh
       context, never a fork) with the repo path, the pass, `docs/design/critique-checklist.md`
       and the module files step 0.4 selected. Paste its report verbatim into
       `docs/design/reviews/<date>-critique.md`. Every S2 goes to the spec's rabbit holes
       with an owner. On BLOCK: one fix of the S3 findings in the pass, then one fresh
       critic on the fix. A second BLOCK is not fixed again: it goes to the owner at the
       gate. Quote the verdict line in section 15.
   6e. **STOP for the Design gate (about minute 12, closed by minute 15 at the latest).**
       Fill the handoff checklist (section 16). Present the problem statement, the persona,
       the principles, the concept, the core flow, the cut list and the critic's verdict
       line, quoted. After a second BLOCK, present its S3 findings too: the owner either
       cuts the failing part (cut list, Backlog card) or accepts the finding as a bet
       logged in section 3 with what would show it false. Ask "Approved?" Log the Gate Log
       line on E1 in one batched update. If the gate runs past minute 12, Gate 1 slips by
       the same amount; the build cut (serial 44; lanes 40 and 42), the minute-28 RLS
       deadline and the lane hand-back time do not move.
   Then write `docs/specs/product-spec.md`: its acceptance criteria are the user stories'
   Given/when/then lines (section 14), one per element of the core flow, edge cases and
   the returning-visitor leg included, plus the rabbit holes (the critic's S2 findings,
   each with an owner). Decide with the owner: serial, or lane mode (below) when the scope
   splits into slices with disjoint files. In lane mode, read "Lane mode" now: it moves
   the lead into its own worktree before step 7, and changes steps 7-12.
7. Write the data model record and the dictionary rows FIRST, then the migration
   (`npm run db:new <name>`). RLS policies with one allow and one deny check each. A table
   anon must read gets an explicit grant in the same migration, with the reason.
8. Run the gate (`--skip-install`; dependencies are installed). In both modes, on any new or
   changed migration, or any change to `docs/architecture/data-model.md` or the dictionary
   (tables, columns, policies, functions, views, grants, indexes, triggers), dispatch
   `data-model-reviewer` (fresh context, never a fork) on the record, the dictionary, the
   migration and its tests. Update E1 and E2 in ONE batched Notion update each: checklist
   boxes, Next Action "Awaiting owner approval for Gate 1", Gate Log line quoting the
   `GATE_RC` line.
9. **STOP for Gate 1 (about minute 18).** Present the spec, the data model, the reviewer's
   verdict (quoted; a BLOCK is fixed and re-gated before Gate 1 is asked) and the slice
   list. Ask "Approved?"

## Build (minutes 18-44)

10. On approval: log the Gate 1 line, create one Sub-task per slice (scope = owned paths,
    estimate S/M/L, order). Apply the migration (`npm run db:push:seed`) and probe it live,
    for each new table:
    `node scripts/probe-rls.mjs --table <table> --owner-column <column> --marker-column <column>`
    (`--row` for its other required columns) must end `RLS_PROBE_RC=0`; quote that line. It
    reads `.env.probe`, which the owner fills from their own terminal with the two public
    Supabase values and `SUPABASE_SECRET_KEY` (never `.env.local`, which goes to Vercel).
11. For each slice, in order: build it, add its tests (every route: happy path and error
    path), run the gate with `--skip-install` to a log, and commit ONLY when its rc is 0.
    Mark the Sub-task built with its gate line. A red gate is fixed before the next slice.
12. At minute 44 (serial; lane mode stops at 40, step L6), stop starting slices. Whatever
    is unfinished is cut, recorded as a Backlog card and a README known gap, not rushed.
12b. **Copy pass and review (serial, minutes 44-47).** First run the copy pass
    (`docs/design/copy-pass.md`) on every user-facing string the feature added or changed;
    record its table and `COPY_PASS:` line in `docs/reviews/<slug>.md`, and commit the
    record and any rewrite through the gate like a slice. Then dispatch `stage5-reviewer`
    once (fresh context, never a fork) on the full feature diff, before the PR to `dev`:
    `repo` the checkout, `diff` `origin/dev..feat/<slug>`, `spec`
    `docs/specs/product-spec.md`, `lenses` `docs/reviews/lenses.md`, `gate` the last gate
    log (its `GATE_TREE` must be the reviewed head). Paste the report verbatim into
    `docs/reviews/<slug>.md`. On BLOCK, fix the findings only, re-gate, commit, and a fresh
    reviewer re-reviews the new head. A second BLOCK: the owner chooses between cutting the
    item the finding sits in (Backlog card, README gap) and stopping the deploy; nothing
    ships over a BLOCK. In lane mode this step does not run here: each lane was reviewed
    before it merged (L5), and step 13 reviews the lead's own commits since the branch was
    cut, copy pass included.

## Lane mode (decided with the owner at step 6)

Lanes only when the scope splits into slices with disjoint files; see "Parallel lanes" in
`docs/process/timeboxed-delivery.md`. `<work dir>` is a folder outside the main checkout. It
holds the lead's worktree, `<work dir>/lead` (the `<lead worktree>`), and one worktree per
lane. Lane mode changes these steps:

* **At the end of step 6**, move the lead into its own worktree. `feat/<slug>` was cut in the
  main checkout at step 5, so: commit the spec on `feat/<slug>`, `git switch dev` in the
  main checkout, then `git worktree add <work dir>/lead feat/<slug>` and `npm ci` there.
  Every later lead step runs in the lead worktree, and the main checkout stays on `dev`.
* **Steps 7-8:** also write `docs/specs/lanes.txt` and the route contracts
  (`src/lib/contracts/*.ts`), and commit everything as Group 0 on `feat/<slug>`. Step 8's
  `data-model-reviewer` dispatch runs as in serial.
* **Step 9 (Gate 1):** also present `lanes.txt` and the contracts.
* **Step 10:** log the Gate 1 line, and instead of one Sub-task per slice create one card
  per lane, all in ONE batched Notion call. The migration apply and live probe move to L3,
  after the lanes are dispatched.
* **Steps 11-12** are replaced by L1-L6:

L1. Read the Group 0 SHA with `git rev-parse HEAD`. For each lane:
    `git worktree add -b feat/<slug>-<lane> <work dir>/lane-<lane> <Group 0 SHA>`, then
    `npm ci` in that worktree.
L2. Dispatch one background writer per lane. Its prompt names the worktree's absolute path,
    the branch, the owned globs, the contract files (read-only), the lane's acceptance
    criteria, and the handback shape: branch, head SHA, the `GATE_RC=` line from its own
    log (`--skip-install` is fine there), files changed, deviations, questions. Every route
    gets a happy-path and an error-path test. No new dependencies, no live API calls in
    tests, no Notion, no push. A contract gap is a BLOCKED handback, never a workaround.
L3. While lanes run, write no code. Apply the migration and probe it live with the RLS probe
    (step 10), green before minute 28: a red after that cuts the item (L4). The lead
    worktree is new, so it has no Supabase link and no `.env.local` (both untracked): link
    it first
    (`./node_modules/.bin/supabase link --project-ref <ref>`), and the operator copies
    `.env.local` in from their own terminal; then `npm run db:push:seed`. Answer BLOCKED
    handbacks and draft the README.
L4. Changes after Gate 1, all committed by the lead on `feat/<slug>` and re-gated:
    * A data-model change (any new or changed migration, or any change to
      `docs/architecture/data-model.md` or the dictionary (tables, columns, policies,
      functions, views, grants, indexes, triggers)) needs the owner's yes and a fresh
      `data-model-reviewer` APPROVE on the change, then is applied and probed live again.
      After minute 28 it is refused: the item it serves is cut.
    * A changed contract file: tell each lane that imports it (resume its writer) to rebase
      its own worktree onto the new commit before it continues. The lead never runs git in
      a lane's worktree: one writer per worktree.
    * A changed `lanes.txt` line (a glob given to a lane after a BLOCKED handback) applies
      at once: the check reads the map from the lead's HEAD, so no lane rebases for it.
    * Gate 1b, for an item scoped now: commit its new contract files and one new line in
      `lanes.txt`. It changes no existing lane's line or contract file, so no running lane
      rebases. With the owner's one-line approval, run L1 and L2 for the new lane, cut from
      that commit.
L5. Per handback, in the spec's order:
    1. `node <lead worktree>/scripts/check-lane-paths.mjs <lane> <head SHA>` reads
       `LANE_PATHS_RC=0`. Git computes the merge of the lane into the lead's HEAD without
       touching a checkout; the check compares every path it changes against the map in
       the lead's HEAD, and prints `diff <lead HEAD> <merge tree>` (the lane head SHA is in
       that line) and the change id (the SHA-256 of git's raw diff of that change). A merge
       that would
       conflict fails: resume the writer to rebase onto `feat/<slug>`, resolve inside its
       own paths, and hand back again. The lead never resolves a lane's conflict.
    2. `stage5-reviewer` (fresh) APPROVEs, given the lead worktree as `repo`, the printed
       `git diff <lead HEAD> <merge tree>` as `diff`, the printed change id, and the lane's
       name and head SHA. On BLOCK the same writer fixes the findings, and the check and a
       new reviewer run on its new head SHA. A second BLOCK cuts the lane.
    3. Merge with the check itself, never with `git merge`, using the `Head:` and
       `Change id:` from the APPROVE report's header (after a BLOCK and a re-handback, the
       newest report's):
       `node <lead worktree>/scripts/check-lane-paths.mjs <lane> <head SHA> --merge <change id>`.
       It re-checks at the current HEAD and refuses unless the change is exactly the
       reviewed one (another lane may have merged since), then merges, asserts the tree,
       builds the commit from the checked tree and parents, moves the branch only if it
       has not moved, and prints `MERGED <sha>` with the tree and both parents. Repo hooks
       are off throughout. Only that line means merged. A refusal (rc 1) means: check
       again, review again. Rc 2 needs you to read its line. A failed commit, or a branch
       moved once the merge started, aborts the merge and says where HEAD is; a branch
       moved earlier is refused before anything is recorded. Only while HEAD is still the
       checked lead HEAD does it name `git reset --hard HEAD`, which the operator runs from
       their own terminal when the agent's guard blocks it, after clearing whatever git's
       quoted error names (a held lock, say); when it says
       another writer moved the branch, never reset: read `git log` first. One `--merge` at
       a time per lead worktree, never retried before the last one's output is read.
       `--merge` never takes `--map`. Re-gate: the gate does what a commit hook would
       check.
    4. `git worktree remove <work dir>/lane-<lane>` and `git branch -d feat/<slug>-<lane>`.
    Update that lane's card once: the check line, the verdict, the merge SHA.
L6. At minute 40, no new lane work: a lane not handed back is cut. A lane not APPROVED by
    minute 42 is cut. A cut lane's worktree is removed; its branch is kept and named on its
    Backlog card (unmerged work is not deleted), and the README lists the gap.

Step 13 starts at minute 42 with every lane merged. First the copy pass; then one
`stage5-reviewer` (fresh) on the lead's own commits since the branch was cut, the ones no
lane review saw: the spec, Group 0, changed contracts, Gate 1b contracts, the copy pass and
anything else the lead committed. The range is
`git log --first-parent --no-merges origin/dev..HEAD` (lane merges have two parents, so they
drop out). Write their combined `git show` output to one patch file,
`git show $(git rev-list --first-parent --no-merges --reverse origin/dev..HEAD) > <work dir>/lead-commits.patch`,
and pass that file as the reviewer's `diff` (it takes a range, a two-argument diff or a
saved patch file), with the spec, the lenses and the last gate log. BLOCK is handled as in
12b. Then the full gate, with install, on `feat/<slug>`.

## Deploy (minutes 47-54; from minute 42 in lane mode)

13. Run the full gate once (with install) on the final tree. Push, PR to `dev`, merge; then
    `scripts/release.sh <slug>` and merge the release PR, as the `deploy_steps` slot says
    (SHA read from the PR, merge confirmed by state).
14. Verify live: `/api/health` returns the merge SHA; Playwright smoke with `BASE_URL` and
    `EXPECTED_SHA`; walk the core flow in the browser, the returning-visitor leg included.
    Before Gate 2, check the copy pass's `COPY_PASS:` line (step 12b, or step 13 in lane
    mode) is in `docs/reviews/<slug>.md`; a string on the live site that the pass missed is
    a Bug card, not a silent edit.
15. Update E3 in one batched update. **STOP for Gate 2.** Present the live URL and the
    evidence. Ask "Approved?"

## Close (minutes 54-60; from minute 53 in lane mode)

16. At minute 54 (53 in lane mode), say so and stop building, whatever state the slices
    are in.
17. README: what the product does and for whom, how to run it, the data model in brief, what
    was cut and why, known gaps, next steps.
18. Update E4, set everything shipped to Shipped. End on `dev` with a clean tree. In lane
    mode, once `gh pr view <n> --json state,mergedAt` shows the PR merged:
    `git worktree remove <work dir>/lead`, then `git branch -D feat/<slug>` (a squash merge
    leaves the branch unmerged in git's eyes, so `-d` refuses).
19. Remind the owner to run `/export` and submit the log unedited.

## Rules that do not bend for time

- Never pipe the gate. Quote its `GATE_RC` line.
- No secrets in chat, code or logs. If one appears, stop and say it needs rotating.
- No `any`, no `@ts-ignore`, no silent catch, no table without a dictionary row.
- Notion is updated at stage changes and gates only, never per command.
