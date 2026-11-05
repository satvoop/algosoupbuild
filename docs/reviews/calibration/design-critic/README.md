# design-critic calibration (key: do not give this file to the critic)

Two design passes for one toy product (Turns, a chore rota for a shared house), written to
`docs/design/design-pass.md`'s sections. They differ only in the planted defects below; every
other line is the same. A critic passes when it BLOCKs the defective pass and APPROVEs the
correct one.

## How to run one

As in `docs/reviews/calibration/README.md`, with these changes:

1. Make a scratch copy with no history (`git archive HEAD | tar -x -C <copy>`), delete
   `docs/reviews/calibration/` from it, `git init` it and commit.
2. Copy ONE fixture to `docs/design/design-pass.md` in that copy with its first line (the
   `CALIBRATION FIXTURE` header) stripped, and commit. The file names here state the
   expected verdict, so the critic only ever sees the fixture under the pass's own path.
3. Dispatch the critic in a fresh context (never a fork): `repo` the scratch copy, `pass`
   `docs/design/design-pass.md`, `checklist` `docs/design/critique-checklist.md`, `modules`
   none (both passes select none at step 0.4). Say how it was dispatched: the
   `design-critic` agent type, or a fresh general-purpose agent told to follow
   `.claude/agents/design-critic.md` and read only those inputs.
4. Repeat in a second scratch copy for the other fixture.
5. Evidence has one home, this folder: `run-<YYYY-MM-DD>.md` (the run of record: each run's
   fixture SHA, agent SHA, dispatch, verdict line quoted and result) and
   `runs-<YYYY-MM-DD>/` beside it (each critic report verbatim, extracted from the run, never
   retyped). A change that triggered the run cites the run file.

## Key

* `defective-design-pass.md`: expect BLOCK. Planted:
  * section 4: the problem statement names a solution ("needs a shared spreadsheet with a
    column per housemate"), not the literal "dashboard" example the template and the critic
    use. Expect S3 (2.1, the critic's step 2).
  * section 10: no returning-visitor leg: no reload or return path, and no "has a house:
    yes" branch from sign-in; section 14 has no story for it, and the traces to it in
    sections 8, 11 and 12 are gone too. Expect S3 (3.4, the critic's step 3).
  * section 5: a generic persona: unranked frustrations with no source, no "would NOT
    want", a day with no moment of use. Expect S2 or above (2.2, the critic's step 4).
  * section 4's own checkbox still claims the statement "describes a need, not a solution",
    and section 16's "every story traces to a step of the core flow" box is ticked as in the
    correct pass. Reporting the contradiction is expected; it is not required.
* `correct-design-pass.md`: expect APPROVE. Expected notes, none blocking:
  * section 8: the Backlog cards are "created at the gate", so no card exists yet. S1.
  * section 1: the timing challenge is weak by its own words. S0 or S1.
  * section 15 is pending: the critic is the step that fills it. Not a finding, or S0.
  * section 9: the rotation rule is defined (Monday 00:00 in the house's timezone, week
    index since creation, a member snapshot per week, joins and leaves from the next
    Monday, "free this week" when chores are fewer than members). A join or leave
    reshuffling everyone's turns is written under "why it might fail" with no story; leaving
    is on the cut list. S1 or S2 (to the rabbit holes); S2 does not block. An S3 on the
    rule itself is a calibration failure: name the case the rule leaves undefined.
  * section 14: stories trace to `[brief]` lines only through the problem statement and the
    persona. S0 or S1.

A critic that APPROVEs the defective pass, or BLOCKs the correct one on a finding not in
this key, fails calibration, and `.claude/agents/design-critic.md` is fixed before it
critiques anything else.

## Measured

Calibrated on 2026-11-04 (template copy on fixtures at a9fb43d): defective BLOCK on both
planted S3s, correct APPROVE. The run of record, all four rounds and the canonical copy's
runs, is `run-2026-11-04.md`, with every critic report verbatim in `runs-2026-11-04/`.
Re-run after any edit named in `docs/reviews/calibration/README.md`.
