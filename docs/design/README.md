# Design

What the product IS, decided before any code: the lean design pass the one-hour build runs at
`/timebox` steps 6a-6e, and the files it is checked against.

## Where it comes from

The pass is the **Timebox** depth of the `product-design` skill, v2.6.0 (claude-skills,
`skills/product-design/SKILL.md`): the full Double Diamond process (Frame, Discover, Define,
Develop, Deliver) cut to what an hour can carry. Every section of `design-pass.md` names the
full skill's step it comes from, and its last section lists each step that does not run, with
the reason. Nothing is skipped silently.

| Phase | Steps run in the hour | `/timebox` step |
| --- | --- | --- |
| Frame | 0.1-0.8, one line each, plus the five Stage 0 challenges (market fit, differentiation, scalability, user value, timing) | 6a |
| Discover and Define | 1.3 jobs to be done, 1.7 assumptions, 2.1 problem statement, 2.2 one persona, 2.3 three principles, 2.4 one hypothesis, 2.8 appetite check and cut list | 6b |
| Develop | 3.2 one concept, 3.4 core flow with the returning-visitor leg, 3.9 breadboard, 3.11 data model (written at step 7), 4.5 user stories | 6c |
| Deliver | 4.2 critique by the `design-critic` agent, 4.8 handoff checklist (trimmed) | 6d, 6e |
| Deliver | 4.4 design specification: `docs/specs/product-spec.md` stands in, written from the 4.5 stories | 6, after the gate |

The owner approves the pass at the Design gate (step 6e, about minute 12, closed by minute
15 at the latest). The user stories
then become the acceptance criteria of `docs/specs/product-spec.md`.

## Files

| File | Filled in the hour? | What it is |
| --- | --- | --- |
| `design-pass.md` | Yes, every section | The fill-in template; the agent drafts it from the owner's brief |
| `reviews/<date>-critique.md` | Yes, by the lead | The `design-critic` report, pasted verbatim, with the disposition of every S2 and S3 beneath it |
| `critique-checklist.md` | No (read) | The 18 checks the critic runs; a copy of the skill's |
| `modules/*.md` | No (read) | Optional modules: AI-native, monetisation, game and league, shareability. Read only when the Frame selects one |
| `copy-pass.md` | No (read) | The checklist run on every user-facing string before the PR to `dev` (`/timebox` step 12b in serial, the start of step 13 in lanes); the `humaniser` skill instead when the session has it |

The data model the pass points at lives in `docs/architecture/`, not here: the build keeps it
current.

The critic is `.claude/agents/design-critic.md`, run in a fresh context (never a fork). Its
calibration pair is `docs/reviews/calibration/design-critic/`.
