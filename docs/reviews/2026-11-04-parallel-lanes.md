# Review: parallel lanes for the timed build (TEMPLATE-9)

Branch `feat/parallel-lanes`. The spec is PR 1 of the approved fast-build plan (the
template-repo items: lane mode in the time-boxed flow, the lane-path check, public review
lenses, checklist and reviewer agents, calibration pairs). Reviewer: a fresh-context Stage 5
agent. Lenses: COMMON 1-6 and this repo's `CLAUDE.md`.

## What changed

* `scripts/check-lane-paths.mjs` (new), with `scripts/lib/lane-merge.mjs` and
  `scripts/lib/is-main.mjs`. The final design (the rounds below show how it got there):
  * the check takes a lane name and the lane's head;
  * git computes the merge of that head into the lead worktree's HEAD (`git merge-tree`,
    no checkout touched);
  * every path that merge would change is checked against the map committed at the lead's
    HEAD (the check form also takes a `--map` override, named in its output): a path outside
    the lane fails, as does a path two lanes own, a merge that changes nothing, a conflict,
    or a map that leaves any protected path (the map, the check's three files,
    `.gitmodules`, `.gitattributes`) to anyone but the lead;
  * it prints a change id: the SHA-256 of git's raw diff of the merge;
  * `--merge <change id>` re-checks at the current HEAD, refuses any change but the
    reviewed one, merges into the worktree, asserts the staged tree, builds the commit from
    the checked tree and the two checked parents (`git commit-tree`, signed when
    `commit.gpgSign` is set), moves the branch only if it is still at the checked lead HEAD
    (`git update-ref` with the old value), and aborts on any failure, naming where HEAD is;
    it names a reset back (`git reset --hard HEAD`) only while HEAD is still the checked
    lead HEAD, and refuses a HEAD that is not on a branch (rounds 14 to 16);
  * every git call runs with repo hooks off (`core.hooksPath=/dev/null`; round 13);
  * `--merge` never takes `--map`.
* `docs/process/timeboxed-delivery.md`, `.claude/commands/timebox.md`: an optional lane mode.
  It covers contracts at Gate 1, Gate 1b, one worktree per writer, the per-lane paths check,
  fresh review and re-gate, and the minute 40 and 42 cuts.
* `docs/reviews/lenses.md`, `docs/architecture/review-checklist.md`: the review lenses and
  D1-D12 for this repo, with no references outside it.
* `.claude/agents/stage5-reviewer.md`, `.claude/agents/data-model-reviewer.md`: public
  reviewers that read the repo's own lenses and checklist.
* `docs/reviews/calibration/`: one defective and one correct change per reviewer. Both are
  real diffs measured both ways; the key and the measurements are in its README.
* `.claude/harness.md`: a public repo keeps the board IDs as placeholders.

## Rounds

| Round | Head | Verdict | Deciding finding |
| --- | --- | --- | --- |
| 1 | 4e89d70 | BLOCK | S3: the correct data-model calibration change left its DELETE policy without an allow test, and its deny test passed with the policy removed. |
| 2 | 740ab5b | APPROVE | No S3. Two S2s (a caller-chosen base could read a lane-written map; the D2 rule asked a deny test to fail on removal, which none can), fixed below rather than dated. |
| 3 | ff79412 | APPROVE | No S3, no S2. Eight S1s, the deciding one a base guard that a merged lane's own commit could pass; all fixed below. |
| 4 | 8c67539 | APPROVE | No S3. Two S2s (the computed base could be a merged lane's intermediate commit; `/timebox` created the lead worktree before lane mode was decided), both fixed below. |
| 5 | e5f6697 | BLOCK | S2: with two merge bases (criss-cross), the computed range hid a revert the merge brings in; a lane reverted the lead's `package.json` and `lanes.txt` with `LANE_PATHS_RC=0`. |
| 6 | 19746b6 | BLOCK | S2: the check's verdict held for the lead HEAD it ran at, and nothing bound it to the HEAD the merge ran on; a lane checked in parallel could merge a change to a sibling's file. |
| 7 | ad9f379 | APPROVE | No S3. Three S2s: `git patch-id` ignores whitespace; a commit hook could change the tree after the assertion; no test held the two new protected files. All fixed below. |
| 8 | 534505a | APPROVE | No S3. One S2, failing closed: a lane diff over 1 MiB overflowed the buffer, so the lane could not be checked or merged. Fixed below, with the simplification the reviewer proposed. |
| 9 | 50a3539 | APPROVE | No S3, no S2. Three S1s: a false "worktree is as before" after a failing hook wrote outside the merge; `--merge` accepted `--map`; this record's opening summary was stale. All fixed below. |
| 10 | dee9af6 | APPROVE | No S3. One S2: the calibration-wording fix of round 9 was missing from the data-model agent. Five S1s. All fixed below. |
| 11 | 1757711 | APPROVE | No S3, no S2. S1s in the round 10 code: the hooks-folder rule parsed the config value instead of asking git, and probed one hook; a merge already in progress was mislabelled; "nothing was changed" was inferred. All fixed below. |
| 12 | 417ca83 | APPROVE | No S3, no S2. Four S1s, all in the hook handling of `--merge`. The reviewer asked whether that machinery is proportionate; the owner chose to cut it (round 13 below). |
| 13 | 5b0d0e0 | APPROVE | No S3, no S2. Four S1s: with the post-commit check cut, a second writer that moved the lead's branch during the merge gave `MERGED`, rc 0, the wrong first parent and a silently reverted lead commit; and three branches had no test that failed without them. All fixed below (round 14). |
| 14 | 91ba47d | BLOCK | S3: with the pre-merge HEAD guard deleted, a branch moved to a commit that already held the lane made `--merge` print `git reset --hard <old lead HEAD>`, which would throw away the other writer's commits; the docs route the operator to run it. Fixed below (round 15). |
| 15 | 26bf89a | APPROVE | The round 14 S3 is closed: in 337 logged harness runs (a branch move before and after each of the 16 git calls, four kinds of move, failures injected at each step) no reset was named while HEAD was off the checked lead HEAD. One S2: a HEAD that is a symbolic ref to a tag, remote or notes ref passed the branch guard. Five S1s. All fixed below (round 16). |
| 16 | 964a213 | APPROVE | The round 15 S2 is closed (tag, remote and notes HEADs refused, no ref moved). In 680 moved-branch runs no reset was named with HEAD off the checked lead HEAD, and no recorded merge was reported as unrecorded. Two S1s, both carried by docs (round 17 below). |

## Round 1 (4e89d70), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=4e89d704e9b0fac985792372702d1e0cbc6fa07f ... SKIP_INSTALL=0`, `GATE_RC=0`; `PROVE_RC=0` (14 proven).

* **S3** `data-model/change-2.patch` had a DELETE policy with no allow test, and its only
  DELETE test was a deny that passed with the policy removed. Measured by the reviewer: with
  the policy deleted, 5 of 5 still passed, and with an `update ... using (true)` policy
  added, 5 of 5 still passed.
  **Fixed in 0494b71:**
  * the tests now cover every policy both ways, plus an UPDATE check (no policy, so nothing
    changes);
  * five policy mutants were run (DELETE removed; UPDATE `using (true)` added; INSERT
    `with check (true)`; SELECT `using (true)`; DELETE `using (true)`); each fails at least
    one test;
  * against the defective model, 4 of 6 fail.
* **S2** The `ownerRows` assertions could not fail, because the helper rolled back first.
  **Fixed in 0494b71:** the owner's rows are now read inside the checked transaction,
  after a savepoint.
  * The mutant run then found a second case of the same class: `INSERT ... RETURNING`
    passed with `with check (true)`, because Postgres applies the SELECT policy to returned
    rows.
  * No write check uses `RETURNING` now, and D2 in the checklist names the trap.
* **S2** The stage5 pair ran against the full spec, with no table in its base.
  **Fixed in 0494b71:**
  * `spec.md` scopes each pair; the stage5 pair runs AC1-AC6 on a base with
    `data-model/change-2` merged;
  * the README's procedure builds that base and keeps the key out of the reviewer's copy.
* **S2** L1 to L3 had dropped their BLOCK rules. **Fixed in 0494b71:** a `GATE_RC` other than
  0, any secret on an added line, and a feature branch targeting `main` are each BLOCK.
* **S2** L7 passed a lane with an unmet criterion, provided it was listed.
  **Fixed in 0494b71:** an unmet criterion is BLOCK unless its cut is recorded (Backlog
  card and README gap) and the review cites that record.
* **S2** A `calibration: true` flag could switch L1 off on a real review.
  **Fixed in 0494b71:** both agents honour the flag only for a `change-1.patch` or
  `change-2.patch` file. Given the flag with anything else, they ignore it, say so, and
  apply L1 in full.
* **S2** `check-lane-paths` read the map from the working tree. Measured by the reviewer:
  an uncommitted map edit flipped `LANE_PATHS_RC=1` to `0`.
  **Fixed in c1254d5:**
  * the map is read from `<base>:docs/specs/lanes.txt` (`--map` is an explicit override);
  * every PASS and FAIL line names the map it used;
  * a range with no base is refused;
  * new case: a lane that widens its own map in its range still fails.
* **S1** The checklist had cut D2, D4, D7, D8 and D12 asks beyond the Origin column.
  **Fixed in 0494b71:** the asks are restored in full, with house references removed. D12
  says which asks are S3.
* **S1** The data-model reviewer traced only one way. **Fixed in 0494b71:** it now traces
  both ways, in the agent and in the checklist's "How the reviewer runs it".
* **S1** The `/timebox` lane steps were out of order and duplicated the serial steps.
  **Fixed in 0494b71:**
  * lane mode is decided at step 6;
  * it amends steps 7-10 in place (Group 0 contracts, the data-model reviewer before Gate 1,
    one card per lane);
  * it replaces steps 11-12 with L1-L5;
  * the migration is applied once, at step 10.
* **S1** The minute 45 and 40 cuts disagreed, and the minute 42 review cutoff was missing.
  **Fixed in 0494b71:**
  * minute 45 is scoped to the serial flow;
  * the lane table carries the 40 and 42 cuts;
  * the minutes 42-45 gate is named as step 13's gate, not a second one.
* **S1** After a rebase, the paths check and the review still used `<group0>`.
  **Fixed in 0494b71:** both docs define `<base>` as the contract commit the lane was cut
  from or last rebased onto, and use it everywhere.
* **S1** L1 required `SKIP_INSTALL=0`, and lane mode never said how a lane gates.
  **Fixed in 0494b71:** a lane's handback gate may skip the install (the lead ran `npm ci`
  in the worktree when it created it); the lead's final gate installs.
* **S1** The harness note was advisory, and `/timebox` step 3 pointed at a placeholder.
  **Fixed in 0494b71:**
  * step 3 reads the board from the operator's local config when the slot holds
    placeholders;
  * the note says bootstrap does not know the repo's visibility, so leaving out
    `--notion-*` is the operator's call.
  * The reviewer agreed that keeping the placeholders is right: bootstrap seds those
    tokens.
* **S1** The record held no behavioural red for the new test.
  **Resolved:**
  * the `--no-renames` mutant (flag removed) passed a moved file (`MUTANT_RC=0`), while the
    real script failed it (`REAL_RC=1`);
  * the five new cases in c1254d5 were red on 4e89d70 (`Tests 5 failed | 12 passed`);
  * the reviewer's own mutation run killed 9 of 9 mutants.
* **S0** Non-ASCII paths were quoted by git. **Fixed in c1254d5:** `-z`, with a new case.
* **S0** `#` truncated a glob. **Fixed in c1254d5:** a comment starts only at a word start,
  with a new case.
* **S0** A lane glob of `**` owned every path the lead did not. **Fixed in c1254d5:** `**`,
  `**/*` and `**/**` are refused, with a new case.
* **S0** The commit author address matches a scrub term. **Accepted:** the address is
  already public through this repo's history.
* **S0** The stage5 agent dropped "a test that cannot fail is S2". **Fixed in 0494b71:** it
  is back in the agent.

Questions answered:

* **The private-name scan.** It ran inline in this session, with the clean config's term
  list (not reproduced here, because it is itself a list of private names), over every file
  the branch adds or changes: 0 hits, and a control term found 76 times. The reusable
  `check-private-terms.sh` is a clean-config deliverable (PR 3), which runs the same scan.
* **Reviewers on the new pairs.** The public reviewers are first run on the pairs in the
  dry run under the clean config, where they are installed. That is a named leg of the dry
  run, not evidence in this PR.
* **Where the lead runs the check.** From its worktree, by absolute path
  (`node <lead worktree>/scripts/check-lane-paths.mjs`). The script runs git against its
  own checkout, and every lane branch is a ref in the same repository.

## Round 2 (740ab5b), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=740ab5bf0f6a7053dbc1b194f8a70fbea85e5d26 ... SKIP_INSTALL=0`, `GATE_RC=0` (169 tests); `PROVE_RC=0` (14 proven). The reviewer re-ran 17 mutants on the correct data model: all 12 policy and privilege mutants were killed.

* **S2** `check-lane-paths` read the map from whatever base the caller named.
  * Measured by the reviewer: a reversed range, and a base that was the lane's own
    widening commit, both passed.
  * **Fixed in d32a535:** the base must be an ancestor of the head, and on the checkout's
    own branch (the lead's integration branch).
  * New case: the lane's widening commit as base, and the reversed range, are both refused
    with rc 2, while the approved base still fails the lane on `package.json`.
* **S2** D2 asked a deny test to fail when its policy is removed. RLS denies by default, so
  no deny test can; and the agent and the checklist gave it different severities.
  **Fixed in this round:**
  * the allow test must fail on removal; the deny test must fail on loosening (to `true`
    or to any signed-in user) and show the row unchanged;
  * one wording and one severity (D2's S3) in the checklist, the calibration spec's AC7 and
    the data-model reviewer.
* **S1** A script reached through a symlink exited 0 with no output.
  * Shown on 740ab5b: `OLD_VIA_SYMLINK rc=0 output_bytes=0`.
  * **Fixed in d32a535:** `scripts/lib/is-main.mjs` compares real paths, and all five
    scripts with the guard use it (the class: check-lane-paths, check-data-dictionary,
    check-waivers, check-vercel, setup-vercel).
  * Covered by a test of its own and a CLI case through a symlink.
* **S1** The calibration flag was guarded by file name only. **Fixed:** every calibration
  patch now starts with a `CALIBRATION FIXTURE` line (`git apply` skips it), and both agents
  honour the flag only for a `change-1.patch` or `change-2.patch` file whose first line
  carries it.
* **S1** `/timebox` step 6 did not decide lane mode. **Fixed:** step 6 asks for the decision,
  and says lane mode changes steps 7-12.
* **S1** `/timebox` applied the migration before the worktrees, while the delivery doc
  applied it during the lanes. **Fixed:** in lane mode the apply and the live probe move to
  L3, after dispatch, which matches the delivery table.
* **S1** The lane prompt left out the happy-path and error-path tests per route. **Fixed:**
  they are in `/timebox` L2 and in the delivery doc's lane rules.
* **S1** `/timebox` had no Gate 1b step, and every contract commit rebased every lane.
  **Fixed:**
  * Gate 1b is in L3;
  * a contract change rebases only the lanes whose contract files it changes;
  * a Gate 1b commit that only adds files rebases none.
* **S1** The correct model's CHECK test probed lowercase only, and a missing cascade
  survived. **Fixed:**
  * the CHECK test adds `ABCDEF`, `BRK.B`, `A1` and the empty string;
  * a new test deletes the account and expects the rows gone;
  * the `{1,10}`, `upper()`, no-UNIQUE and no-cascade mutants are now killed (12 of 12 in
    all; see the calibration README).
* **S1** The correct route exported `parseTicker`, which `next build --webpack` rejects.
  **Fixed:** it moved to `parse-ticker.ts`; the webpack build of the correct pair is clean.
* **S1** The key listed no expected non-blocking findings for the correct fixtures.
  **Fixed:**
  * the key lists the D9 timing, the FORCE statement and the mocked database seam;
  * the correct model's record now states the types timing and why FORCE is not set.
* **S1** `L4 Tests` flagged untested branches in the lane check. **Fixed:** new cases for a
  three-dot range, a base with no map, `--map` with no file, and a range with no dots.
* **S0** `*/**` slipped past the owns-everything list. **Fixed:** any glob whose first segment
  holds a wildcard is refused, in every spelling (six cases).
* **S0** Undefined `<work dir>` and `<lead worktree>`, the deploy minutes, and "review if
  time allows". **Fixed:**
  * lane mode defines both placeholders;
  * the deploy heading notes the minute-42 start in lane mode;
  * the delivery doc says review is mandatory per lane in lane mode.

Questions answered:

* **`TERMS_RC` for this PR.** The inline scan writes its own rc line to a log, and the PR
  body quotes that line. The term list stays out of the repo and the PR.
* **Owners and dates for the S2s.** None needed: both are fixed in this PR.
* **The calibration of the public reviewers.** It is leg 3 of the dry run, recorded on the
  board card of this change.

## Round 3 (ff79412), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=ff794129c2b3ac69e0e7eecad1fc049fa86623b4 ... SKIP_INSTALL=0`, `GATE_RC=0` (175 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0`. The reviewer confirmed the round 2 fixes by mutation (checkBase removed, and the old argv guard, each went red), and killed all 12 listed fixture mutants.

* **S1** The base guard accepted any commit in the lead's history, including the own commit
  of a lane already merged (measured: a widen-then-revert lane, merged `--no-ff`, then its
  widening commit as base, gave `LANE_PATHS_RC=0`).
  **Fixed:**
  * the lead no longer types a base: `check-lane-paths.mjs <lane> <lane head SHA>`;
  * the script computes the base as the merge-base of the lane and the checkout's HEAD,
    reads the map from it, and prints the range;
  * new cases: the widen-then-revert lane, merged, cannot widen the next lane; a lane
    already merged fails on an empty range; a lane cut before another merged, and a lane
    rebased onto a later contract commit, both pass (the allow side the reviewer asked
    for);
  * a mutant that reads the map from the lane's head instead fails 2 of 23.
* **S1** Gate 1b was "a commit that only adds files", but it must add a line to `lanes.txt`.
  **Fixed:** a Gate 1b adds the new item's contract files and one new line in `lanes.txt`,
  and changes no existing lane's line or contract file (both docs).
* **S1** A data-model change after Gate 1 skipped review and the live re-probe.
  **Fixed:** it needs the owner's yes and a fresh `data-model-reviewer` APPROVE, and is
  applied and probed live again (`/timebox` L4, delivery doc).
* **S1** No step created the lead's worktree. **Fixed:** in lane mode, step 5 cuts
  `feat/<slug>` as `<work dir>/lead` with `git worktree add`, and every later lead step runs
  there.
* **S1** "Merge into feat/<slug>" named no SHA. **Fixed:** the lead merges exactly the
  reviewed head SHA (`git merge --no-ff <head SHA>`), never the branch name. After a BLOCK
  fix, the check and a new reviewer run on the new head SHA.
* **S1** No lane cleanup. **Fixed:**
  * after a merge, the lead removes the worktree and deletes the branch;
  * a cut lane's worktree is removed, and its branch is kept and named on its Backlog card
    (unmerged work is not deleted).
* **S1** The correct model had no anon test beyond SELECT (measured: an anon INSERT grant
  plus policy survived 7 of 7). **Fixed:**
  * anon SELECT, INSERT, DELETE and UPDATE are each refused `42501` with the owner's rows
    unchanged;
  * new mutants killed: anon INSERT, `user_id` nullable (a new NOT NULL case), and SELECT,
    INSERT and DELETE each loosened to any signed-in user;
  * 17 of 17 killed, and 5 of 7 fail against the defective model.
* **S1** The D2 wording differed: "to `true` or to any signed-in user" in the checklist, and
  "to `true`" in the agent and AC7. **Fixed:** all three now carry the full wording.
* **S1** The key could be read from the copy's history. **Fixed:** the README makes the copy
  with `git archive` and a fresh `git init`, and forbids a clone or a worktree.
* **S0** There was no allow-side case for merged or rebased lanes. **Fixed:** see the first
  item.
* **S0** The `isMain` rethrow branch was untested. **Fixed:** an `ENOTDIR` case.
* **S0** `created_at` NOT NULL is untested. **Accepted:** no D row requires it, and it is a
  default-filled column.
* **S0** The calibration header stops accidents, not misuse. **Accepted:** the stated scope
  of the guard.
* **S0** A long line in the data-model agent. **Fixed.**

Questions answered:

* **The term scan.** It now covers every tracked file in `docs/` and `.claude/`, plus every
  changed file: 46 files, 0 hits, a control found 80 times.
* **`db:push` against the connector.** `npm run db:push:seed` is the template's documented
  apply path (`harness.md` `data_model` slot). The timed-build skill can use the Supabase
  connector instead; that is the skill's choice, not the template's.
* **A re-run after a BLOCK fix.** Yes: the check and a new reviewer run on the new head SHA
  (`/timebox` L5 step 2, delivery doc step 4).

## Round 4 (8c67539), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=8c675391e443c529119c4ab53a4abbbbe5164168 ... SKIP_INSTALL=0`, `GATE_RC=0` (177 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0` (46 files).

* **S2** `git merge-base` could return an intermediate commit of a merged lane.
  * Measured by the reviewer: a lane widened the map, reverted it, and was merged; a later
    head descending from the widening commit read its map there, and passed with an
    unowned `scripts/evil.sh`.
  * **Fixed:** the map is read from the lead worktree's committed HEAD, never from a base.
    Any net change a lane makes to `lanes.txt` fails its own check, so HEAD's map holds
    only what the lead committed, whatever commit the merge-base turns out to be. The range
    is still merge-base..head, which is what a merge brings in.
  * New case: the reviewer's shape, a lane cut from inside a merged lane, fails on
    `scripts/evil.sh`. The round 3 design run as a mutant (map from the computed base)
    fails it.
* **S2** `/timebox` created the lead worktree at step 5, but lane mode is decided at step 6.
  **Fixed:** at the end of step 6, in lane mode:
  * commit the spec on `feat/<slug>`;
  * switch the main checkout back to `dev`;
  * `git worktree add <work dir>/lead feat/<slug>` and `npm ci`.

  Every later lead step runs there. Step 6 says so when it asks for the decision, and
  step 18 removes the lead worktree at the end.
* **S1** The "merged lane" test could not fail for the hole above. **Fixed:** replaced by the
  test of the reviewer's shape.
* **S1** The correct fixture's constraint tests checked only the reject side. Measured by
  the reviewer: `{4}`, `{2,5}` and `unique (ticker)` each passed 7 of 7.
  **Fixed:**
  * a test now accepts `A` and `ABCDE`, and the same ticker for a second user;
  * the three mutants are killed (20 of 20 in all), and 5 of 8 fail against the defective
    model.
* **S1** The stage5 agent ran the check by a relative path, and its inputs named neither the
  lead worktree nor the head SHA.
  **Fixed:**
  * for a lane review, the agent is given the lead worktree as `repo`, plus `lane` and
    `head`;
  * it runs `<repo>/scripts/check-lane-paths.mjs`, never a lane worktree's copy;
  * `/timebox` L5 and the delivery doc say which `repo` the reviewer gets.
* **S1** `check-lane-paths lead <ui head>` passed a lane that edited `package.json`.
  **Fixed:** `lead` is refused as the lane to check, with a new case.
* **S1** A glob reassigned by the lead after a BLOCKED handback was not seen: the check read
  the old map. **Fixed:** because the map comes from the lead's HEAD, a committed map change
  applies at once, with a new case. Both docs say so.
* **S1** `/timebox` step 12 pointed at L5 for the minute-40 cut. **Fixed:** L6.
* **S0** The delivery doc used `<lead worktree>` undefined. **Fixed:** it is defined at the
  integration section.
* **S0** Nothing removed the lead worktree at the end. **Fixed:** step 18.
* **S0** Long lines in the data-model agent. **Fixed** (and the long first line of
  `lenses.md`).
* **S0** For a lane that merged `feat/<slug>` into itself, "the contract commit it was cut
  from" was wrong. **Resolved:** the docs no longer describe the base; they describe the
  range as what a merge brings in.

Questions answered:

* **The mutant record.** The calibration README lists all 20 mutants, the three new ones
  included.
* **The reviewer's `repo`.** The lead worktree (see above).

## Round 5 (e5f6697), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=e5f6697818279f9519be74b46e85543f9afae1c3 ... SKIP_INSTALL=0`, `GATE_RC=0` (179 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0` (46 files).

Rounds 1 to 5 found the same class four times: a range the script computed was not exactly
what the merge brings in (a typed base, a reversed range, a merged lane's commit, two merge
bases). This round fixes the class instead of the instance: the script no longer computes
a range.

* **S2** Criss-cross merges hid a revert. Measured by the reviewer: a lane merged the lead's
  commit and a merged sibling's head, then reverted `package.json` (and in another repro
  `lanes.txt`), and passed; `git merge` then reverted them on the integration branch.
  **Fixed:**
  * the check runs `git merge-tree --write-tree HEAD <lane head>`: git's own merge,
    virtual merge base included, with no checkout touched;
  * it compares every path that merge would change against the map at the lead's HEAD;
  * a merge that would conflict fails: the lane rebases, resolves inside its own paths,
    and hands back again;
  * new case: the reviewer's shape, with commit dates pinned so a single `git merge-base`
    picks the sibling, as a lane could arrange. The script as of e5f6697 PASSes that lane;
    the new one fails it on `package.json`;
  * mutants killed: drop the protected-path rule; treat a conflict as a pass.
* **S1** L7 lost its base check in round 4. **Resolved:** there is no base left to check.
  L7 now asks the reviewer to review exactly the `diff <lead HEAD> <merge tree>` the check
  prints, with the map line `(lead HEAD)`.
* **S1** Nothing stopped a lane from owning `lanes.txt`. **Fixed:**
  * the check refuses (rc 2) a map in which `docs/specs/lanes.txt`,
    `scripts/check-lane-paths.mjs` or `scripts/lib/is-main.mjs` is owned by anyone but the
    lead alone;
  * new unit and CLI cases;
  * the example map gives `scripts/**` to the lead;
  * the delivery doc names the three paths.
* **S1** The new lead worktree has no Supabase link or `.env.local`. **Fixed in the text:**
  L3 links the lead worktree and has the operator copy `.env.local` in before
  `db:push:seed`. Not measured here: the dry run is the first run of it.
* **S1** `/timebox` dropped "a second BLOCK cuts the lane" and the conflict rule. **Fixed:**
  both are in L5.
  * The conflict rule is now stricter than the plan's section 4 ("the lead resolves it, and
    the merge commit gets its own review"): the check refuses a conflicting merge, and the
    lane resolves its own conflict.
  * Every merged line has therefore passed the check and a review.
  * This is a deliberate deviation from the plan, recorded here.
* **S1** `/timebox` had the lead rebase a lane's worktree. **Fixed:** the lead tells the lane
  to rebase its own worktree, and never runs git in a lane's worktree (both docs agree).
* **S1** `ticker` NOT NULL was untested, because a CHECK passes on NULL. **Fixed:**
  * a NULL ticker is refused with `23502`;
  * the mutant is killed (21 of 21);
  * 5 of 8 fail against the defective model.
* **S1** The test file was over 300 lines. **Fixed:** three files:
  * the unit tests (99 lines);
  * the CLI tests (`check-lane-paths.cli.test.ts`);
  * a shared helper (`helpers/lane-repo.ts`).
* **S0** A test was still named "a base with no map". **Fixed:** "a lead HEAD with no map".
* **S0** Deleting `feat/<slug>` named no command. **Fixed:** step 18 confirms the merge with
  `gh pr view --json state,mergedAt`, then runs `git branch -D` (a squash merge makes `-d`
  refuse).
* **S0** A deferrable FK and SELECT `to public` survive. **Accepted:** under the secure
  defaults they behave the same, as the reviewer noted.

Questions answered:

* **Step 6 against the plan's layout.** The template's `/timebox` is generic: it starts in
  the main checkout, so in lane mode it moves the lead into a worktree at step 6. The
  timed-build skill (the operator layer, a later PR) starts the lead in its own worktree
  cut from `origin/dev`, so the main checkout stays with the setup thread.
* **Owners and dates for the S2s.** None needed: every S2 so far was fixed in this PR before
  merge.

## Round 6 (19746b6), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=19746b658a0a7b69a40a04a502a642b081cb4c9a ... SKIP_INSTALL=0`, `GATE_RC=0` (182 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0` (48 files). The reviewer killed 12 of 13 script mutants, and re-ran the criss-cross case against e5f6697 (red there, as recorded).

* **S2** The check was not bound to the merge. Measured by the reviewer: two lanes passed at
  one HEAD; one merged; the second's `git merge --no-ff <SHA>` then removed the first's
  `SECURITY-CHECK` line. A second repro restored a line the lead had reverted in a
  contract.
  **Fixed:**
  * the check prints a patch id of the change its merge brings in
    (`git patch-id --stable`), and the review names that id;
  * the lane is merged only by `check-lane-paths.mjs <lane> <head SHA> --merge <patch id>`;
  * that re-runs the check at the current HEAD, refuses unless the change still has the
    reviewed patch id, refuses a dirty lead worktree or a HEAD that moved during the run,
    merges with `--no-commit -s ort`, asserts the staged tree is the checked tree (or
    aborts), and only then commits, printing `MERGED <sha>`;
  * a HEAD that moved while the lane's change stayed the same still merges; a changed
    change needs a new check and a new review;
  * new cases: a clean `--merge`; the reviewer's sibling shape (refused, the
    `SECURITY-CHECK` line survives); a wrong patch id (refused, HEAD unchanged); a dirty
    worktree (rc 2);
  * mutants killed: skip the patch comparison.
  * The staged-tree assertion is not killed by any test: no git config was found that makes
    `git merge` and `merge-tree` disagree (`branch.<name>.mergeOptions` with `-Xsubtree` was
    tried; the trees matched). It can only abort a merge, never pass one, so it stays as a
    backstop and is recorded here as untested.
* **S1** The diff honoured `diff.ignoreSubmodules` and `.gitmodules`. **Fixed:**
  * every diff passes `--ignore-submodules=none`;
  * `.gitmodules` and `.gitattributes` join the protected files;
  * new case: a lane that bumps a lead-owned gitlink fails, even with
    `diff.ignoreSubmodules=all` set;
  * the mutant without the flag is killed.
* **S2** `created_at` NOT NULL was untested: the class fix of round 5 covered one sibling of
  the class. **Fixed:**
  * every NOT NULL column (`user_id`, `ticker`, `created_at`) now has a NULL insert
    refused with `23502`;
  * 22 of 22 mutants killed; 5 of 8 fail against the defective model.
* **S0** Stale "range" wording. **Fixed:**
  * the script header and the empty message now say "the merge changes nothing";
  * the stage5 agent takes a two-argument diff and records the patch id.
* **S0** The output printed the head as typed. **Fixed:** it prints the resolved SHA.
* **S0** `merge-tree` was given the literal `HEAD`. **Fixed:** it is given the resolved lead
  HEAD, the same commit the map and the diff use.
* **S0** The git version was undocumented. **Fixed:** the script header and the delivery doc
  say git 2.38+ (an older git fails with rc 2).
* **S0** The merge used the lead's configured strategy. **Fixed:** `--merge` passes
  `-s ort`.
* **S0** The `^{commit}` peel was untested. **Fixed:** a tree id is refused with rc 2.

Questions answered:

* **`nullable` in the dictionary check.** Pre-existing and outside this diff. It is
  recorded as a Backlog card on the template board (TEMPLATE-10), not fixed here.
* **Whether the lead worktree's HEAD is the `feat/<slug>` tip.** `--merge` merges into
  whatever HEAD the lead worktree has, and step 6 creates that worktree on `feat/<slug>`.
  The check does not assert the branch name; the lead runs it there by the procedure.

## Round 7 (ad9f379), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=ad9f379a176689f1290013a2f4b0f786a25c9848 ... SKIP_INSTALL=0`, `GATE_RC=0` (187 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0` (48 files). Dispatched with the threat model stated (lanes are the lead's own subagents), and asked to say whether each finding is reachable by accident.

* **S2** `git patch-id --stable` ignores whitespace. Measured by the reviewer: a reviewed YAML
  file and an unreviewed dedent of it shared an id, and `--merge` merged the dedent.
  Reachable by accident: a lane that runs a format pass after its handback.
  **Fixed:**
  * the id is now a change id: the SHA-256 of the exact diff the merge brings in, with the
    diff output pinned (`--no-ext-diff --no-textconv --no-color --no-relative`);
  * new cases: the dedent after review is refused; the same id under `diff.external` and
    `color.ui=always`;
  * the old patch-id design, run as a mutant, fails the dedent case.
* **S2** A pre-commit hook could change the tree after the staged-tree check. Measured by the
  reviewer: a hook that staged `package.json` produced a merge commit changing it, and the
  script printed `MERGED` with the checked tree and exited 0.
  **Fixed:**
  * hooks still run (they are not skipped);
  * after the commit, the committed tree is asserted equal to the checked tree; if it is
    not, the check fails rc 1, names the commit and both trees, and says how to undo it
    (`git reset --keep HEAD~1`), leaving the commit for the lead to inspect;
  * new case; the mutant without the check is killed.
* **S2** No test held `.gitmodules` and `.gitattributes` in the protected list. **Fixed:** the
  unit test now expects all four non-map protected files by name when the lead lacks them;
  the mutant that drops the two is killed.
* **S1** A failed commit after `merge --no-commit` left a merge in progress. **Fixed:**
  * the merge is aborted on a failed commit, and the message says so;
  * the dirty-worktree message now names a merge in progress and `git merge --abort`;
  * new case (a hook that exits 1: rc 2, HEAD unchanged, a clean index); the mutant without
    the abort is killed.
* **S1** No test merged a second lane after the HEAD moved, the normal path for lanes 2 to N.
  **Fixed:** a new case merges `api`, then `ui` with its pre-move change id, rc 0.
* **S1** The id did not pin the diff config. **Fixed:** see the first item; the mutant that
  honours external diffs and colour is killed.
* **S1** The delivery doc never said the check prints the id, or that the review names it.
  **Fixed:** steps 1 to 3 now carry the change id.
* **S0** The HEAD-moved case was refused by the path re-check, not by the id.
  **Resolved:** the new dedent case is refused by the id alone, with the paths unchanged.
* **S0** The HEAD-moved-during-the-run guard and `-s ort` are untested. **Accepted:** the
  first needs a commit landing between two git calls in one process; the second is the
  default strategy, passed explicitly against config.
* **S0** "The time it was added" was untested. **Fixed:** a new case asserts `created_at` is
  within a minute of now; a `default '2000-01-01'` mutant is killed (23 of 23 in all).
* **S0** A deny loosened with `or ticker <> 'AAPL'` survives, because the deny tests seed
  only AAPL. **Accepted:** AC7 names loosening to `true` or to any signed-in user, and both
  are killed.
* **S0** The stage5 agent's diff bullet was unwrapped, and `--merge` was not excluded.
  **Fixed:** rewrapped, and the agent is told never to pass `--merge`.
* The test files are now three, each under 300 lines: unit (102), CLI (200) and merge
  (161). The script is 297 lines.

Questions answered:

* **The card id for `nullable`.** TEMPLATE-10.
* **Branch names for `--merge`.** It accepts any ref, but the change id now binds the exact
  diff, so a lane commit after the review is refused whatever name is passed. `/timebox`
  still passes the head SHA.
* **Products with commit hooks.** `--merge` runs the hooks, and fails closed if one changes
  the tree. A product whose hooks rewrite files on commit will see a lane's merge refused
  until the hook is fixed or the lead merges by hand after review. That is a call for the
  product, recorded here; the template ships no hooks.

## Round 8 (534505a), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=534505a3da7db6d559053fc4ec9f565da70e7464 ... SKIP_INSTALL=0`, `GATE_RC=0` (192 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0` (49 files). The reviewer found no exit-0 failure path.

* **S2** A lane diff over 1 MiB gave `ENOBUFS`, rc 2: the lane could be neither checked nor
  merged by the sanctioned path. It failed closed, but a large fixture reaches it by
  accident.
  **Fixed, by the reviewer's S1 simplification:**
  * the change id is the SHA-256 of git's raw tree-to-tree diff (`diff-tree -r --raw
    --full-index -z`): every changed path with both modes and both blob ids;
  * that output stays small whatever the file sizes, and the hunk text it replaced is gone;
  * the git runner's buffer is raised too;
  * new case: a 1.5 MB fixture is checked and merged.
* **S1** "Pinned against user config" was false for `diff.noprefix`, `diff.context`,
  `core.quotePath`, `diff.orderFile` and `GIT_DIFF_OPTS`. **Fixed:**
  * the check now uses plumbing (`diff-tree`), which no porcelain diff config touches;
  * the new case sets all of those plus `diff.external`, `color.ui` and `diff.relative`,
    and `GIT_DIFF_OPTS=-u0`, and the id is unchanged;
  * `--no-relative` and the other pinning flags are gone, as the reviewer noted they were
    moot.
* **S1** A hook that rewrites a file and then fails left `git merge --abort` unable to run.
  **Fixed:**
  * the hook's own error is reported first;
  * when the abort fails, the message names the way back (reset to the lead HEAD, which is
    safe because the tracked tree was clean when `--merge` started);
  * new case.
* **S1** A hook that changed the tree left an unreviewed merge commit on `feat/<slug>` with
  rc 1, and `/timebox` did not say so. **Fixed:**
  * the check undoes its own merge commit with `git reset --keep`, which refuses rather
    than lose work;
  * it says so, or names the command if the undo fails;
  * the new case asserts HEAD is back and `package.json` is untouched;
  * `/timebox` L5 says only `MERGED <sha>` means merged, and what a hook failure means.
* **S1** The id hashed hunk text when a raw diff fixes the change exactly. **Fixed:** see the
  first item.
* **S0** Stale "patch" wording in the delivery doc and the test names. **Fixed.**
* **S0** `/timebox` step 1 did not say the check prints the id. **Fixed.**
* **S0** `lanes.example.txt` named only the check form. **Fixed:** it names `--merge` too.
* **S0** The stage5 agent's inputs did not list the change id. **Fixed:** `change` is an
  input, named in the report header.
* **S0** The calibration README demanded a re-run after every edit, with none recorded.
  **Fixed:**
  * the README now asks for a run before the template's first timed build (the operator's
    dry run, under the clean config that installs the agents), and after later edits;
  * until then the reviewers are uncalibrated, and the review file says so: they are
    uncalibrated as of this PR.
* **S0** A global `core.hooksPath` could hide the planted hooks. **Fixed:** the test repos
  set `core.hooksPath` locally.
* The merge half of the script moved to `scripts/lib/lane-merge.mjs` (68 lines), which
  joins the protected files; the script is 262 lines.
* Two new cases (the 1 MiB fixture, the failing hook) and two strengthened ones (the
  config class, the undo) are red on the 534505a script; the gate went from 192 to 194
  tests.

Questions answered:

* **A card for the 1 MiB limit.** None needed: fixed in this PR.
* **Undoing the hook-changed commit.** Done, as above.
* **Exit 0.** `finish(0)` is reached only after the check passes, and with `--merge` only
  after `MERGED`; this round adds no exit-0 path.

## Round 9 (50a3539), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=50a353925beebb26bbfd0b0a27536a11ef56533e ... SKIP_INSTALL=0`, `GATE_RC=0` (194 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0` (50 files). The reviewer found no change-id collision, no two ids for one change, and no exit-0 path other than the `--map` one below.

* **S1** After a failed commit whose hook wrote a file outside the merge, `merge --abort`
  succeeded and the check claimed "the worktree is as before". Measured by the reviewer:
  ` M package.json` remained.
  **Fixed:**
  * every abort (failed commit, staged-tree mismatch, and now a `git merge` that disagrees
    with the check) goes through one helper;
  * the helper re-reads the tracked status after the abort, and names the changed files
    and the way back (`git reset --hard <lead HEAD>`, from the operator's terminal if a guard blocks
    the agent) instead of claiming a clean tree;
  * new case: a hook writes `package.json` and exits 1; red on 50a3539.
* **S1** `--merge` accepted `--map`, so a merge could land against an uncommitted map, with
  the same change id. **Fixed:**
  * `--merge` with `--map` is refused (rc 2);
  * new case; red on 50a3539 (it merged there).
* **S1** This record's "What changed" still described the round 1 design. **Fixed:** it now
  describes the final design and points at the rounds.
* **S0** `/timebox` did not cover the rc-2 abort case. **Fixed:** L5 step 3 names it, and who
  runs the reset.
* **S0** The hard-reset way back cannot run under an agent's guard. **Fixed:** the message and
  `/timebox` say the operator runs it from their own terminal.
* **S0** The `join(" ")` indirection for the reset text. **Removed:** the message is built in
  one place (`wayBack`).
* **S0** A failed abort after a tree mismatch reported only git's error. **Fixed:** it reports
  the mismatch, the abort error and the way back (same helper).
* **S0** A `git merge` that conflicts where `merge-tree` did not left git's own "fix
  conflicts" message. **Fixed:** it is aborted, with "do not resolve it by hand".
  * A config that makes the two diverge was not found. The new catch is reachable another
    way, though: git refusing to start the merge (round 10 below).
* **S0** The undo-failed message did not say the hook's edits must go first. **Fixed.**
* **S0** The undo test asserted only HEAD. **Fixed:** it also asserts the worktree file is
  back to `v1`.
* **S0** "SHA-256 of that exact diff" was loose. **Fixed:** "of git's raw diff of that
  change".
* **S0** The stage5 agent's calibration line disagreed with the README. **Fixed:** both now
  say a run is due before the first timed build, and the reviewer is uncalibrated until
  then.
* **S0** The round 8 case count. **Fixed:** two new cases and two strengthened ones.
* **S0** `/timebox` did not say which head and id to merge. **Fixed:** the newest pair, from
  the APPROVE report's header.

Questions answered:

* **The guard in the clean config.** It carries the same guard, so the hard reset is the
  operator's, as above.
* **What the term scan covers.** Every file the branch adds or changes against
  `origin/dev`, plus every tracked file in `docs/` and `.claude/` (50 at 50a3539).
* **husky.** The delivery doc tells the map author to give an in-repo hooks folder to the
  lead. The check does not enforce it, because it cannot know the folder.

## Round 10 (dee9af6), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=dee9af626e306b4c90a1fa19b5a95f5913aa77e6 ... SKIP_INSTALL=0`, `GATE_RC=0` (196 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0` (50 files). The reviewer replayed both round 9 cases against 50a3539 (red) and dee9af6 (green).

* **S2** Round 9 fixed the stage5 agent's calibration line but not the data-model agent's.
  **Fixed:** the data-model agent now carries the same wording: a run is due before the first
  timed build, and the reviewer is uncalibrated until then. (Round 11 found the stage5
  agent's trigger list still shorter than the README's; fixed there.)
* **S1** An untracked file at a path the lane adds made `git merge` refuse to start, and the
  check then claimed a merge it could not abort and sent the operator to a needless hard
  reset. Reachable by accident.
  **Fixed:**
  * when `git merge` fails, the check looks for `MERGE_HEAD`;
  * with none, it reports git's own reason and that nothing was changed (rc 2), and names
    no reset;
  * new case; red on dee9af6.
* **S1** The record called that catch unreachable. **Fixed:** the round 9 entry now says the
  catch is reachable this way.
* **S1** `/timebox` took the head SHA from a review header that had none. **Fixed:**
  * the stage5 report header now carries `Head:` beside `Change id:`;
  * `/timebox` names both;
  * the check's own line already printed the head SHA (since round 6); only the docs changed.
* **S1** An in-repo `core.hooksPath` was not enforced as lead-owned. **Fixed:**
  * the check reads `core.hooksPath`;
  * when it points inside the worktree (outside `.git/`), it refuses (rc 2) a map that
    leaves `<hooksPath>/pre-commit` to anyone but the lead;
  * new case (husky's `./.husky/`, refused, then accepted with the folder given to the
    lead); red on dee9af6;
  * the delivery doc says the rule is enforced.
* **S1** Only the tree was asserted after the commit, not the parents. Measured by the
  reviewer: a hook that rewrote `MERGE_HEAD` gave `MERGED`, rc 0, with the wrong second
  parent.
  **Fixed:**
  * the parents must be exactly the lead HEAD and the lane head;
  * otherwise the commit is undone with `reset --keep`, like a changed tree;
  * new case; red on dee9af6.
* **S0** A staged-tree mismatch had moved to rc 2. **Fixed:** a mismatch, a disagreeing `git
  merge` and a refused change are rc 1 (fail); rc 2 stays for "could not run" (a failed
  commit, an abort that failed or left files changed, a merge git would not start).
* **S0** A failure of the post-abort `git status` would hide the hook's error.
  **Accepted:** it needs `git status` itself to fail just after a successful abort.
* **S0** An empty hook stderr printed "...: .". **Fixed:** it prints "no output".
* **S0** The usage string read as if the two options combined. **Fixed:** it shows the two
  forms.
* **S0** "What changed" left out the `--map` override and two protected files. **Fixed.**
* **S0** `/timebox` described the id differently from the delivery doc. **Fixed:** both say
  "the SHA-256 of git's raw diff of that change".

Questions answered:

* **A card for the hooks folder.** None needed: enforced in this PR.
* **The staged-tree assertion in a mutation run.** The round 6 run recorded it as surviving:
  no test makes `git merge` and `merge-tree` disagree. It is still a backstop that can only
  abort.

## Round 11 (1757711), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=17577117b028760afeefd0eb9439efdf907c2fe7 ... SKIP_INSTALL=0`, `GATE_RC=0` (199 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0` (50 files). The reviewer replayed the three round 10 cases against dee9af6 (red) and 1757711 (green).

* **S1** The hooks-folder rule compared the raw config value.
  * Its failures: an absolute path inside the worktree was skipped; `~/` and `../` were
    refused on every check (a common global-hooks setup would have stopped lane mode);
    only `pre-commit` was probed, while `git commit` also runs `prepare-commit-msg`,
    `commit-msg` and `post-commit`; and husky v9's `_` shim sources hooks from its parent
    folder.
  * **Fixed (now `scripts/lib/lane-hooks.mjs`, protected):**
    * the folder comes from `git rev-parse --git-path hooks`, so git resolves `~`,
      absolute and relative values;
    * a folder outside the worktree, or in `.git`, is out of scope;
    * inside the worktree, all four commit hooks must be the lead's alone, and for a folder
      named `_` the parent folder's four too;
    * new cases: unset; relative refused, then accepted; absolute in-repo refused; `~/`
      and `../` accepted; a lane owning `commit-msg` refused; husky's `_` with a lane
      owning `.husky/pre-commit` refused, then accepted with `.husky/**` given to the lead;
    * the behaviour cases are red on 1757711.
* **S1** A merge already in progress was aborted and reported as "git merge disagreed".
  **Fixed:**
  * `--merge` refuses to start (rc 2) while `MERGE_HEAD` exists, and leaves it alone;
  * new case (an `-s ours` merge in progress); red on 1757711.
* **S1** "nothing was changed" was inferred from a bare catch. **Fixed:**
  * after a failed `git merge`, the check measures HEAD, `MERGE_HEAD` and the tracked status
    and says "nothing was changed" only when all three show it;
  * the probe's catch handles exit 1 alone and rethrows anything else.
* **S1** A failed undo left an unreviewed commit on HEAD with rc 1, which `/timebox` reads as
  "check again". **Fixed:** rc 2 (it needs the operator), and the message says the commit is
  still on HEAD.
* **S1** The docs and this record overclaimed the hooks rule. **Fixed:** both now say what is
  checked (git's resolved folder, four hooks, husky's parent) and what is out of scope.
* **S1** No test ran the unset, absolute, `~/` or `../` branches. **Fixed:** the new
  `check-lane-paths.hooks.test.ts` runs them all.
* **S0** The script header did not mention the parents or the hooks rule. **Fixed.**
* **S0** `/timebox` mentioned a changed tree but not changed parents. **Fixed.**
* **S0** The stage5 agent's re-run triggers were shorter than the README's. **Fixed:** the
  agent file, the lenses, the checklist or a fixture.
* **S0** The round 10 record claimed the head SHA as new on the check's line. **Corrected:**
  it was already there.

Questions answered:

* **The lane-check mutation record.** Each round from 6 on proved its new cases red on the
  previous head, and ran mutants of its new guards (rounds 6-8). It is not a gate step, so
  `prove-gate-fails.sh` has no lane mutation.
* **The simpler probe.** Taken: one `MERGE_HEAD` pre-flight, plus a measured
  HEAD-and-status comparison after a failed merge.

## Round 12 (417ca83), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=417ca83f5054fbfb20de4244e0013172e9cba7fb ... SKIP_INSTALL=0`, `GATE_RC=0` (205 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0`. The reviewer ran the round 11 cases against 1757711: 6 red, as claimed.

* **S1** The hooks rule listed four hooks as "every hook `git commit` runs". Measured on git
  2.43: `git commit` also runs `reference-transaction`, and `git merge --no-commit` runs
  `reference-transaction` and `post-index-change`. A lane given `.husky/reference-transaction`
  passed the check and its hook ran inside `--merge`.
* **S1** The hooks rule failed open for a hooks folder at the worktree root, and for an
  absolute `core.hooksPath` written through a symlinked alias of the worktree.
* **S1** Three mutants survived: the failed-undo rc 2 changed to 1, and the HEAD and status
  checks in the measured "nothing was changed".
* **S1** The delivery doc's merge step still said "asserts the committed tree" with no
  parents and no rc 2 for a failed undo.
* **S0** `/timebox` said rc 2 always names `git reset --hard`; the record's summary said
  "rounds 1-9"; an error inside the catch of a failed merge would lose git's own reason.
* **Question, proportionality.** The core (merge-tree, diff-tree, the map, the protected list,
  about 200 lines) fits a threat model of trusted lanes that wander by accident. The hook
  machinery (lane-hooks.mjs, the undo and the abort-after-hook cleanup, about 60 lines and 9
  tests) does not. The reviewer proposed running `--merge`'s git calls with
  `-c core.hooksPath=/dev/null` (measured: 0 of 29 planted hooks ran) and relying on the
  re-gate after each merge.

**Resolution.** The owner chose the cut on 2026-11-04 ("Yes, cut it"). Every finding above
is in the code the cut removes, or in wording it rewrites. Round 13 records what changed.

## Round 13: hooks off for every git call the check makes

Why hooks off is enough. The hook handling existed for one reason: a hook could change the
merge commit after its tree was asserted, so the commit would not be the reviewed change.
With no hook running, the commit is the staged tree, already asserted, on the parents git
recorded (the asserted lead HEAD and MERGE_HEAD). A hook that a lane wrote is lane code under
review, like the tests the re-gate runs; hooks off is about the integrity of the merge, not
about keeping lane code from running. Whatever a project's hooks check (lint, format, a
commit message) the gate re-run after each merge checks too. This supersedes the round 7
answer on products with commit hooks: their hooks no longer run on a lane's merge commit.

What changed:

* `scripts/check-lane-paths.mjs`: the git runner passes `-c core.hooksPath=/dev/null`,
  which overrides any repo, user or worktree setting. The hooks-folder rule and its import
  are gone; `scripts/lib/lane-hooks.mjs` is deleted and leaves the protected list.
* `scripts/lib/lane-merge.mjs` (101 to 79 lines):
  * the undo of a hook-changed commit and the post-commit tree and parents checks are gone;
    `MERGED` prints the committed tree and both parents, for the record;
  * the abort no longer checks for files a hook left changed;
  * a merge that fails with no `MERGE_HEAD` says "no merge is in progress", which is
    measured, instead of "nothing was changed", which the surviving mutants showed no test
    could tell from a guess.
* Tests (51 lane cases to 43): `check-lane-paths.hooks.test.ts` and five hook cases are
  deleted. New cases:
  * nine hooks planted in the repo's hooks folder (`pre-merge-commit`, `pre-commit`,
    `prepare-commit-msg`, `commit-msg`, `post-commit`, `post-merge`,
    `reference-transaction`, `post-index-change`, `post-checkout`), each writing a marker
    and staging a change: `MERGED`, no marker, the commit's tree is the checked tree, its
    parents are the lead HEAD and the lane head;
  * a commit that fails at signing: rc 2, aborted, HEAD and the tracked tree as before, no
    `MERGE_HEAD`;
  * a signing failure that leaves an index lock, so git cannot abort: rc 2 and the
    `git reset --hard <lead HEAD>` way back;
  * the untracked-file case now also asserts git's own reason and a clean tracked tree.
* Docs: the delivery doc's map and merge steps, `/timebox` L5, and this record's summary.

## Round 13 (5b0d0e0), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=5b0d0e06f9984d333b4502bd2b0349f4cda9aaea ... SKIP_INSTALL=0`, `GATE_RC=0` (197 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0` (50 files). The reviewer planted all 29 hook names in eight places `core.hooksPath` can point (repo, relative, absolute, husky's `_` shim, `~/`, user-global, worktree config, an environment override): 0 ran with the fix; 6 ran in the control with the `-c` removed.

* **S1** The round 13 claim "nothing can change the merge between the assertion and the
  commit" was false. Measured by the reviewer: a program that git runs from config
  (`core.fsmonitor`) moved the lead's branch while `git merge --no-commit` ran; `--merge`
  printed `MERGED`, rc 0, with the side commit as first parent, and the side commit's
  `package.json` was silently reverted. 417ca83 refused the same run. A related false
  message: when the move landed during the commit, the check said "the worktree is as
  before" with HEAD at the moved commit.
* **S1** After the cut, the staged-tree assertion was the only tree check, and no test
  failed without it. The reviewer reached it with a merge driver (from untracked
  `.git/info/attributes`) that `git merge` runs differently from `git merge-tree`.
* **S1** No test took the "git merge disagreed with the check" branch.
* **S1** No test asserted the tree and parents the `MERGED` line prints, which the
  delivery doc makes the contract.
* **S0** The "HEAD moved during the check" guard had no test, at 417ca83 either; an error
  checking for `MERGE_HEAD` inside the failed-merge catch lost git's own reason (a round 12
  S0 the round 13 record wrongly counted as removed); three of the nine planted hook names
  in the round 13 test never fire on this path, though the record listed all nine.
* **Questions.** Config-defined hooks in a newer git; Windows; a tracked file pulled into
  `.git/config` by `[include]`.

## Round 14: the commit is built, not taken from the index

* `scripts/lib/lane-merge.mjs`:
  * the merge still runs in the worktree (`git merge --no-ff --no-commit`), and the staged
    tree must equal the checked tree;
  * the commit is then built with `git commit-tree <checked tree> -p <lead HEAD> -p <lane
    head>`, so its tree and parents are the checked ones by construction, whatever the index
    or a hook holds. Its message names the lane, the head and the change id. `commit-tree`
    does not read `commit.gpgSign`, so the check passes `-S` when it is set;
  * the branch moves with `git update-ref HEAD <commit> <lead HEAD>`, which refuses if the
    branch is no longer at the checked lead HEAD. A second writer is refused, not detected
    afterwards. Then `git merge --quit` clears the merge state;
  * after any abort, the check reads HEAD and says so (rc 2) if it is not the checked lead
    HEAD, instead of "the worktree is as before";
  * the "HEAD moved during the check" guard is deleted: update-ref covers it where it
    matters, and no test could tell it apart;
  * an error probing for `MERGE_HEAD` inside the failed-merge catch now carries git's merge
    reason too.
  * The file is 99 lines (101 at 417ca83, 79 at 5b0d0e0): the hook machinery is gone, and
    the plumbing commit adds back about 20 lines.
* Why the integrity no longer rests on hooks off. The recorded commit is fixed by
  `commit-tree`'s arguments and `update-ref`'s old value. A hook, a config-driven program, a
  merge driver or another writer can make the merge fail, or run, but cannot change what is
  recorded. That also answers the newer-git question: a hook defined in config that
  `core.hooksPath` did not switch off could run, but not change the commit. Unmeasured: such
  a git version, and Windows (`/dev/null` there); neither affects what is recorded.
* `[include]` in `.git/config`: out of scope. A lane cannot write `.git/config`, and the
  protected list covers only the tracked files that change how git diffs and merges.
* Tests (47 lane cases, from 43). The commit cases moved to a new
  `check-lane-paths.commit.test.ts` (the merge file would have passed 300 lines); the two
  output parsers moved to the helper. Cases:
  * the happy path asserts the exact `MERGED` line (commit, lane head, tree, both parents),
    the committed tree, the message, no `MERGE_HEAD` and a clean tree;
  * hooks off, with the six hooks that fire on this path when hooks are on (the round 13
    test's other three names never fire, so they are dropped);
  * the merge commit is signed when `commit.gpgSign` is set;
  * another writer moves the branch during the commit (from the signing program): rc 2,
    nothing recorded, HEAD at the other writer's commit, said so, no `MERGE_HEAD`;
  * a merge driver that `git merge` runs differently: the staged-tree check aborts, rc 1;
  * a merge driver that refuses under `git merge`: "disagreed", aborted, rc 1;
  * the two signing-failure cases from round 13, unchanged.
* Mutation run: 20 mutants over `lane-merge.mjs` and the hooks-off `-c`, each with the
  lane tests, the file restored and compared byte for byte after each. 19 killed. The one
  survivor was the "HEAD moved during the check" guard, now deleted.
* Docs: the delivery doc's merge step and `/timebox` L5 describe the built commit, the
  moved-branch refusal and what rc 2 means; the script header says the same.

## Round 14 (91ba47d), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=91ba47d47481dca1b77bf1b4e4be78e87e3bdfe1 ... SKIP_INSTALL=0`, `GATE_RC=0` (201 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0` (51 files). The reviewer wrapped `git` on PATH to move the lead's branch at each call `--merge` makes, re-ran the round 13 race, driver and hooks experiments, and measured signing parity with real ssh and openpgp keys (repo, user and environment config; a non-default `user.signingKey`): the merge commit and a `git commit` control were signed by the same key in every case. Mutation: 28 mutants, 5 survivors.

* **S3** The deleted guard was not covered by `update-ref`. When another writer moves the
  branch, between the check and `git merge`, to a commit that already contains the lane (a
  retried or concurrent `--merge`), `git merge` finds nothing to merge and leaves no
  `MERGE_HEAD`; the abort then fails ("MERGE_HEAD missing"), and the check printed
  `git reset --hard <old lead HEAD>` without reading HEAD. Running it would rewind the
  integration branch over the other writer's commits. 5b0d0e0 refused the same run with a
  true message.
* **S1** The round 14 record, `/timebox` and the delivery doc said every abort reports where
  HEAD is, and that no test could tell the guard apart; both measured false.
* **S1** The probe-error branch added in round 14 had no test (a mutant survived).
* **S1** No test ran `--merge` with `commit.gpgSign` unset, the common case: the helper pins it
  to false, so `--default=true` survived.
* **S0** `MERGED` printed before `git merge --quit`, so a failed quit left `MERGE_HEAD` with rc
  2 after `MERGED`; the signing config was read after the merge started; a raw ref move
  before the dirty check reads as "uncommitted changes" (as at 5b0d0e0, nothing recorded);
  survivors on pre-existing code (the `MERGE_HEAD` probe's exit 1), the reflog text, and
  `--quit` versus `--abort` on a clean tree (equivalent).
* **Questions.** Should the lead forbid a retried `--merge`? Is a detached HEAD refused?

## Round 15: a reset is named only while HEAD is where the check left it

* `scripts/lib/lane-merge.mjs`:
  * one function names the way back. It reads HEAD; if HEAD is not the checked lead HEAD it
    says another writer moved the branch and not to reset, and only otherwise names
    `git reset --hard <lead HEAD>`. Both the abort-failed path and the moved-HEAD path use
    it;
  * the abort runs only when a merge is in progress (`MERGE_HEAD`); after it, HEAD is read,
    and "the worktree is as before" is said only when HEAD is the checked lead HEAD. The
    wording is now "nothing was recorded";
  * the pre-merge "HEAD moved during the check" guard is back (its round 14 deletion was the
    S3);
  * a detached HEAD is refused before anything starts (`update-ref HEAD` would move it
    silently);
  * `commit.gpgSign` is read before the merge starts;
  * `git merge --quit` runs before `MERGED` prints; if it fails, the check says the merge is
    recorded as `<sha>`, rc 2, and to run `git merge --quit`.
* Tests (54 lane cases, from 47). A test-only `git` wrapper on PATH (`wrappedGit` in the
  helper) runs a shell `case` on each call's arguments, then the real git, so a branch move
  or a failure lands at one exact call. New `check-lane-paths.race.test.ts`:
  * the branch moves between the check and the merge (at the guard's own `rev-parse HEAD`):
    the guard refuses, rc 2, no reset named;
  * the branch moves, at `git merge`, to a commit that already holds the lane (the S3 case):
    rc 2, "Nothing was recorded, and HEAD is now <other>", no reset named, no `MERGED`;
  * `git merge` fails and the `MERGE_HEAD` probe fails too: both reasons reported;
  * `git merge --quit` fails after the check's own update-ref: "merged as <sha>", rc 2,
    the commit's parents are the checked ones.
  * In the other files: git cannot abort after another writer moved the branch (no reset
    named); no signing when `commit.gpgSign` is unset at every level (user and system config
    switched off for the run); a detached HEAD is refused and nothing moves.
  * Red on 91ba47d: 9 of the 26 cases in the three changed files (`RED_RUN_RC=1`), among them
    the S3 case, the guard, the detached HEAD and the failed `--quit`. The probe-error and
    unsigned cases pass there too: the behaviour existed, untested.
* Mutation run on the final file: 28 mutants over `lane-merge.mjs` and the hooks-off `-c`
  (each branch, each rc, each guard, the signing default, both parents, the update-ref old
  value, the `MERGED` fields), each against the 54 lane cases, the file restored and compared
  byte for byte after each: 28 killed, `MUTANTS_RC=0`.
* Docs: the delivery doc's merge step and `/timebox` L5 say when a reset is named and when it
  must not be run, that a detached HEAD is refused, and that one `--merge` runs at a time
  per lead worktree and is never retried before its output is read (the reviewer's first
  question). The script header is unchanged and true.

## Round 15 (26bf89a), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=26bf89a025068639679fa3e508a460b8cd740a59 ... SKIP_INSTALL=0`, `GATE_RC=0` (208 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0` (52 files). The reviewer ran the 28 mutants plus 12 of its own on a `git archive` copy: 38 of 40 killed. `wrappedGit` was checked under dash and under `bash --posix` (macOS's `/bin/sh`).

* **S2** The branch guard caught only a literal detached HEAD. A HEAD that is a symbolic ref
  to `refs/tags/*`, `refs/remotes/*` or `refs/notes/*` passed it, and `update-ref HEAD`
  moved that ref with `MERGED`, rc 0 (measured 3 of 3; reachable only through plumbing).
* **S1** Every `update-ref` failure was labelled "the lead's branch moved during the merge";
  a stale branch lock gives the same failure with no move.
* **S1** The `MERGE_HEAD` probe in the abort path had none of the failure handling the merge
  start has: a failing probe dropped the reason and where HEAD was.
* **S1** The docs said a moved branch "aborts the merge and says where HEAD is". A move
  before `git merge` starts reads as "uncommitted changes" or "git merge did not start",
  with no HEAD named (no reset named either).
* **S1** Dropping `--type=bool` from the signing read killed no test, so `commit.gpgSign=yes`
  would have left the merge unsigned while `git commit` signs.
* **S1** The way back named `git reset --hard <lead SHA>`. It is printed only while HEAD is
  that SHA, so `git reset --hard HEAD` does the same at print time and cannot rewind a
  branch that moves before the operator runs it.
* **S0** Reading the signing config before the merge cannot be observed (`git merge` refuses a
  bad value itself): an equivalent mutant. A failed `write-tree` reaches "could not run"
  with the merge in progress (unchanged since 91ba47d). HEAD was read twice in the abort. The
  record's wording on the `--quit` case; a broken line wrap in the delivery doc.
* **Question, proportionality.** Nothing has to go; the reviewer asks whether the owner
  wants to freeze the file after this round.

## Round 16: the remaining round 15 findings

* `scripts/lib/lane-merge.mjs`:
  * the branch guard requires HEAD to resolve to `refs/heads/...`; a detached HEAD and a HEAD
    pointing at a tag, remote or notes ref are both refused before anything starts;
  * `whereHead` reads HEAD once and returns whether it moved and what to say; the reset it
    names is `git reset --hard HEAD`, still only while HEAD is the checked lead HEAD;
  * the abort path's `MERGE_HEAD` probe is wrapped like the merge start's: a failing probe
    reports the reason, the probe's error and where HEAD is (rc 2);
  * an `update-ref` failure says it refused to move the branch "(it moved during the merge,
    or a lock is held)".
* Tests (56 lane cases): a HEAD pointing at a tag is refused and the tag does not move; the
  probe fails while aborting a failed commit (both reasons and HEAD's position reported);
  the signing case sets `commit.gpgsign=yes`, so the boolean read is tested; the moved-branch
  and abort-failed cases expect the new wording.
* Not changed (S0): the failed `write-tree` path, as before; the equivalent signing-order
  mutant.
* Mutation run on the final file: the 28 round 15 mutants with anchors moved to the new
  code, plus the branch guard narrowed back to "detached only", the boolean read without
  `--type=bool`, the abort probe's error swallowed, and the reset naming the SHA: 32
  mutants, 32 killed, `MUTANTS_RC=0`.
* Docs: the delivery doc and `/timebox` L5 separate a branch moved once the merge started
  (aborted, HEAD named) from one moved earlier (refused before anything is recorded), name
  `git reset --hard HEAD`, and say a HEAD not on a branch is refused; the line wrap is fixed.

## Round 16 (964a213), findings and resolutions

Gate quoted by the reviewer: `GATE_TREE=964a2138acf83806a085898310c0fb7834a83331 ... SKIP_INSTALL=0`, `GATE_RC=0` (210 tests); `PROVE_RC=0` (14 proven); `TERMS_RC=0` (52 files); `MUTANTS_RC=0` (32 of 32; the reviewer read six per-mutant logs and each failed on a behavioural assertion). The reviewer re-ran the moved-branch harness at 964a213: 680 runs (four kinds of move, before and after each of the 17 git calls, with and without a failure injected at commit-tree, update-ref, `merge --abort` and `merge --quit`).

* **S1** The delivery doc listed how a branch moved before `git merge` is refused ("a HEAD
  that moved, uncommitted changes or a merge that did not start"). Of 24 measured runs only 6
  read that way; the rest read as a staged tree that is not the checked tree, or an
  update-ref refusal, with HEAD named. All 24 were safe (rc 2, nothing recorded, no reset
  named). **Fixed (docs):** the doc no longer lists messages; it says nothing is recorded
  unless the line says `MERGED` or "merged as", and that the line names HEAD when it moved.
* **S1** Where git could not abort because of a held lock, the named `git reset --hard HEAD`
  fails for the same reason (as round 14's `git reset --hard <sha>` did). Nothing is lost,
  and git's quoted error names the lock. **Fixed (docs):** the delivery doc and `/timebox`
  L5 say to clear whatever git's quoted error names first.
* **S0** "A reset is named only when git cannot abort" missed the probe-failure path, which
  also names it (safely). **Fixed (docs):** both now say "only while HEAD is still the
  checked lead HEAD", which is the rule the code applies.
* **S0** If `whereHead`'s own `rev-parse HEAD` throws inside a catch, only "could not run"
  prints; true of every `whereHead` call site before this commit. Not changed.
* **S0** The round 15 row said 338 harness runs; 337 are logged. **Corrected.**
* **Question.** Whether a docs-only follow-up may close the two findings in
  `lane-merge.mjs` so the file stays frozen: yes, as above.

## Round 17: docs only

`scripts/lib/lane-merge.mjs` is unchanged after round 16 (proposed to the owner as frozen:
the last four rounds each found smaller edge cases in code the round before had added, and
the threat model is trusted lanes and accidental wandering). This round changes the delivery
doc's merge step, `/timebox` L5 and this record only. It is gated (quoted in the PR) and not
sent for another code review, since no code changed.
