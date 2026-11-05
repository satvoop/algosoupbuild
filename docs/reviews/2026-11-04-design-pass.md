# Review: lean design pass at product-design Timebox depth

Branch `feat/design-pass`, PR #15 to `dev`. Spec: the approved plan's change 2 (the lean
design pass, the `design-critic` agent, a mandatory `stage5-reviewer` in serial mode, the
copy pass, renaming a product-named env-var fixture, a calibration pair). Reviewer: a fresh
`stage5-reviewer` per round. Lenses: `docs/reviews/lenses.md`.

Verbatim reports: PR #15 comments. They are kept there, not here, because they quote the
old fixture names this PR removes.

| Round | Head reviewed | Verdict |
| --- | --- | --- |
| 1 | 12b0238 | BLOCK |
| 2 | cd16bca | APPROVE (S1s fixed in 3e76c61 and 052f41d) |

## Round 1 (12b0238): BLOCK

* **S3** design-critic calibration not run. **Fixed:** run in three rounds and recorded in
  cd16bca (`docs/reviews/calibration/design-critic/run-2026-11-04.md`); verbatim reports
  added in 3e76c61.
* **S2** calibration deferred in prose, with no card. **Fixed** in cd16bca: the run happened,
  so nothing is deferred.
* **S2** a second product-named env-var fixture left in three test files. **Fixed** in
  e53c3ad: renamed to `EXAMPLE_API_KEY`, and its helper and lower-case sibling renamed too.
* **S1** the key misdescribed the defective fixture's section 16. **Fixed** in e53c3ad.
* **S1** the planted problem statement used the prompt's own "dashboard" example. **Fixed**
  in e53c3ad: the plant is now a spreadsheet.
* **S1** `copy-pass.md` and `docs/design/README.md` still said step 14. **Fixed** in e53c3ad.
* **S1** the lane-mode copy pass went unreviewed. **Fixed** in e53c3ad (its own review);
  widened in 3e76c61 to every lead commit since Group 0.
* **S1** the data-model-reviewer trigger was narrowed and the two docs disagreed. **Fixed**
  in e53c3ad; one wording everywhere in 3e76c61.
* **S1** minute-25 deadlines unchanged while Gate 1 moved to about 18. **Fixed** in e53c3ad:
  moved to 28. The window is still UNMEASURED: no dry run of the new timeline.
* **S1** close at 54 in both modes, against fast-build's 53 for lanes. **Fixed** in e53c3ad.
* **S1** 3.7 and 3.8 merged under one reason, with no brand-constraints field. **Fixed** in
  e53c3ad.
* **S1** 4.4 listed as skipped, not as a trace row. **Fixed** in e53c3ad.
* **S1** `[evidence]` against canonical's `[brief]`. **Fixed** in e53c3ad.
* **S1** critic row 18 and canonical parity. **Fixed** in e53c3ad: the template keeps its
  row-18 handling and adds the no-research and `[brief]` lines; the canonical copy ported
  the template's Timebox mode (claude-skills PR #50).
* **S1** Design gate with no second-BLOCK rule and no time bound. **Fixed** in e53c3ad (one
  re-critique, closed by minute 15); slip rule added in 3e76c61.
* **S1** the copy pass did not say whether the humaniser runs. **Fixed** in e53c3ad.
* **S0** fixture file names reveal their verdicts. **Accepted:** the procedure copies the
  fixture to `docs/design/design-pass.md` in a scratch copy with the calibration folder
  deleted (stated in 3e76c61).
* **S0** critique-checklist row 17 drops a clause the header does not name. **Accepted:**
  the header says row 17 is stated without the source product's examples, and editing the
  checklist would reopen the calibration this PR records.
* **S0** pre-existing finance-flavoured calibration fixtures (out of diff). **Accepted for
  this PR:** outside the diff; raised to the lead for a card.
* **S0** an over-long line in the delivery doc. **Fixed** in e53c3ad.

## Round 2 (cd16bca): APPROVE

* **S1** section 15 and the section 16 box contradicted the bounded gate. **Fixed** in
  3e76c61.
* **S1** three different data-model-reviewer trigger sets. **Fixed** in 3e76c61: one wording
  in timebox step 8 and L4, the delivery doc and lenses L6.
* **S1** the calibration procedure did not strip the fixture header. **Fixed** in 3e76c61.
* **S1** two homes for calibration evidence. **Fixed** in 3e76c61: `run-<date>.md` and its
  `runs-<date>/` folder only.
* **S1** the run record was second-hand, with no verbatim verdict. **Fixed** in 3e76c61: nine
  reports kept verbatim, and the record quotes their verdict lines and says each run was a
  general-purpose agent following the agent file, not the agent type.
* **S1** lane mode left the lead's own commits after Gate 1 unreviewed. **Fixed** in 3e76c61:
  step 13 reviews them; the "not folded away" claim now matches.
* **S0** no Gate 1 rule when the Design gate runs late. **Fixed** in 3e76c61.
* **S0** the 4.7 reason was not word-equal to canonical. **Fixed** in 3e76c61.
* **S0** 12b gets 3 minutes for a copy pass, gate and review. **Accepted:** the timeline is
  untimed until a dry run measures it.
* **S0** long lines. **Fixed** for `copy-pass.md` in 052f41d.
  **Accepted** for `.claude/agents/design-critic.md`: editing the agent file would reopen its
  calibration.

## Gate

The fix commit's gate, from the run log:
`GATE_TREE=3e76c619d846466822dacfae4b607ad6a2a530ce BRANCH=feat/design-pass DIRTY_FILES=0 BASE=origin/dev ONLY=all SKIP_INSTALL=0 DATE=2026-11-04T19:24:17Z`,
`GATE_RC=0`. Every later head is gated again, and the latest line is in the PR body.

## Calibration re-runs

**`stage5/` pair at 325663e: re-run, PASS.** Triggered by the lenses L6 trigger wording
(3e76c61). Run per `docs/reviews/calibration/README.md`:

* The scratch copy came from `git archive` of 052f41d, with `docs/reviews/calibration/`
  deleted and `data-model/change-2.patch` applied as the base (f008f66 in the scratch repo).
* Each run was a fresh general-purpose agent instructed to follow this repo's
  `.claude/agents/stage5-reviewer.md` with `calibration: true`. It was not the agent type.
* Both reports are kept verbatim in `docs/reviews/calibration/stage5/runs-2026-11-04/`,
  extracted by script; the private-term check found 0 hits. The verdict lines below are
  copied from them.

| Patch | Report | Verdict line | Deciding findings | Expected | Result |
| --- | --- | --- | --- | --- | --- |
| `change-1.patch` | `s5cal-change-1.md` | `VERDICT: APPROVE` | no S3. S2: every test mocks the Supabase client, so the seam is untested. S1: the regex bounds are not pinned; readJson's rethrow branch has no test; the getUser error is dropped; the mock ignores the table name | APPROVE | PASS |
| `change-2.patch` | `s5cal-change-2.md` | `VERDICT: BLOCK` | S3s: 200 `{ ok: true }` whatever happened; the insert error is discarded and the catch is silent; no signed-out branch; `request.json()` unhandled and no validation; the one test asserts 200, not 201. S2: the mock replaces both seams | BLOCK | PASS |

Against the key:

* change-1: the key expects the mocked seam as S0, or as S1 naming the seam. This run gave
  S2. That is above the key's severity, but it does not block and the verdict is APPROVE.
* change-2: the report names every planted defect except the untyped body (`request.json()`
  returning an untyped value), which it does not raise as a finding of its own. The verdict
  does not depend on it.

**Calibration re-runs at a9fb43d: all PASS.** Triggered by the lenses L6 change (3e76c61)
and the fixture and template edits (3e76c61, a9fb43d). Each run was a fresh
general-purpose agent instructed to follow the named agent file. It was not the agent type.
Every report is kept verbatim, extracted by script; all four new ones passed the
private-term check with 0 hits. The verdict lines below are copied from them.

* **design-critic pair** (fixtures at a9fb43d). The blind scratch copies were built with
  `git show a9fb43d:<path>`: the agent file, the checklist, the modules, and the fixture
  with its `CALIBRATION FIXTURE` line stripped. Reports are round 4 in
  `docs/reviews/calibration/design-critic/runs-2026-11-04/`, and `run-2026-11-04.md` has
  them as r4.
  * correct, `r4-template-correct.md`: `VERDICT: APPROVE`, no S3. Expected APPROVE. PASS.
  * defective, `r4-template-defective.md`: `VERDICT: BLOCK` on both planted S3s (2.1 shared
    spreadsheet; 3.4 no returning-visitor leg), plus an S2 for the generic persona.
    Expected BLOCK. PASS.
* **data-model pair.** The scratch copy came from `git archive a9fb43d` with
  `docs/reviews/calibration/` deleted, and the agent followed
  `.claude/agents/data-model-reviewer.md` with `calibration: true`. Reports are in
  `docs/reviews/calibration/data-model/runs-2026-11-04/`.
  * `change-1.patch`, `dmcal-change-1.md`: `VERDICT: BLOCK`. It found every planted defect:
    the `true` policies, the missing dictionary row, the account column's class and
    erasure, the serial, varchar and timestamp types, no UNIQUE, no ON DELETE, the record
    contradicting the SQL, and the owner-only test. Expected BLOCK. PASS.
  * `change-2.patch`, `dmcal-change-2.md`: `VERDICT: APPROVE`, no S2 or S3. The dictionary
    check gave rc 0, and 14 of 14 policy mutants were killed. S0 notes: a client-settable
    `created_at`, the template-default TRUNCATE grant, and a column's class. Expected
    APPROVE. PASS.
* **stage5 pair.** Its inputs are `.claude/agents/stage5-reviewer.md`,
  `docs/reviews/lenses.md`, `CLAUDE.md` and `.claude/harness.md`.
  `git diff --stat 052f41d a9fb43d` on those paths prints nothing, so the PASS run on the
  052f41d archive (above) covers a9fb43d.
