# Design pass: <product name>

Skill: `product-design` v2.6.0 (Timebox depth)

The lean design pass for the one-hour build: the full product-design process cut to what an
hour can carry, with every cut written down in section 17. The agent drafts it from the
owner's brief; the owner approves it at the Design gate (`/timebox` step 6e). Each section
names the full skill's step it comes from. Fill every `<...>`. A section that does not apply
reads `N/A: <reason>`, never blank.

Tags, as in `product-design` 2.6.0: `[brief]` (stated by the operator in the brief; at
Timebox depth it is the research line and counts as evidence), `[assumption]` (believed, not
stated or shown), `[decision]` (the owner decided; the critic treats it as an input).

* Brief: <where the owner's brief is: pasted in the session at minute <n>, or a file path>
* Drafted: <UTC time>. Design gate approved: <UTC time and the owner's words, quoted>

## 1. Frame (Phase 0, steps 1-8)

One line each.

| Step | Item | Line |
| --- | --- | --- |
| 0.1 | The question: what decision this pass enables | <one sentence> |
| 0.2 | Appetite | One hour from minute 0 (<UTC time>). Scope fits the hour, not the other way round. |
| 0.3 | Decider | The owner. |
| 0.4 | Modules (`docs/design/modules/`) | <none, or ai-native / monetisation / game-and-league / shareability, each with its reason> |
| 0.4 | Data depth line | <each data class present with its evidence: personal data; money or units with money's worth; agents in production; more than one tenant. Or "persists nothing", and section 12 is N/A> |
| 0.5 | Four risks | The table below. Re-read at the handoff (section 16). |
| 0.6 | Hard constraints | <budget, platforms, exclusions decided up front; the stack is the template's (`docs/adr/0001-stack.md`)> |
| 3.7 | Brand constraints | <one line from the brand guide in the brief (voice, banned words, colours), or "no brand guide in the brief: 3.7 skipped"> |
| 0.7 | What is not researched | No users are reachable in the hour: no interviews, observation or synthesis (1.1, 1.2, 1.8). <anything else> |
| 0.8 | Inputs on hand | <each input, what it is evidence of, and what it only asserts> |

Four risks, first read (Cagan):

| Risk | Known | Assumed | What would kill it |
| --- | --- | --- | --- |
| Value | | | |
| Usability | | | |
| Feasibility | | | |
| Viability | | | |

The five challenges (orchestrator Stage 0, `product-vision`), one line each:

| Challenge | Line |
| --- | --- |
| Market fit: is there proven demand? | |
| Differentiation: why this over the alternatives? | |
| Scalability: does it scale with the business? | |
| User value: what measurable improvement? | |
| Timing: why now? | |
| Why they would pay (`product-owner`) | |
| What kills it | |

Project challenges (`.claude/harness.md`, `stage0_extra`):

* A real workflow with state, or a wrapper around a model call? <answer>
* What the user does on day one that they could not do before, in one sentence: <answer>

## 2. Jobs to be done (1.3)

| Layer | Job | Source |
| --- | --- | --- |
| Functional | <the practical thing they are trying to do> | <`[brief]` and the line, or `[assumption]`> |
| Emotional | <how they want to feel> | |
| Social | <how they want to be seen, and by whom> | |

Job statement: When <situation>, I want to <motivation>, so I can <expected outcome>.

## 3. Assumptions (1.7)

No plot in the hour. List every assumption behind the idea; the important ones with no
evidence in hand are the riskiest set, marked RISKIEST. No test runs in the hour (2.7 is
skipped), so each RISKIEST row is carried as an accepted bet with the fact that would show it
false after launch.

| # | Assumption | Type | Important? | Evidence in hand | RISKIEST: accepted bet, and what would show it false |
| --- | --- | --- | --- | --- | --- |
| A1 | | desirability / viability / feasibility | yes / no | none / `[brief]` <line> | |

## 4. Problem statement (2.1)

> **<User>** needs a way to **<need>** because **<insight>**. Currently, **<what happens
> instead>**, which causes **<consequence>**.

* [ ] Describes a need, not a solution ("needs a dashboard" is a solution).
* [ ] Specific enough to design against.
* [ ] Supported by all three job layers in section 2.
* [ ] The user would recognise it as theirs.

## 5. Persona (2.2)

One persona, cut down from the full skill's persona template. Every attribute traces to a
`[brief]` line or is tagged `[assumption]`.

* Name and role: <a first name, a role; fictional, marked so>
* Their day: <two sentences, present tense: when they would reach for this, and what they do before and after>
* Frustrations, ranked:
  1. <biggest> -- <source>
  2. <second> -- <source>
  3. <third> -- <source>
* Would NOT want (at least two; a persona who wants everything is too generic):
  * <thing>
  * <thing>

## 6. Principles (2.3)

Three. Opinionated (each rules something out), in tension (at least two trade against each
other), specific to this product. "Easy to use" is not a principle.

| # | Principle | Rules out | Trades against |
| --- | --- | --- | --- |
| P1 | | | |
| P2 | | | |
| P3 | | | |

## 7. Hypothesis (2.4)

One, not one per opportunity.

> We believe **<business outcome>** will be achieved if **<these users>** successfully
> **<user outcome>** with **<this concept>**. We will know this is true when we see
> **<signal>**.

How the signal is read after launch: <the query, event or count>. It stands in for HEART
(2.5, skipped).

## 8. Appetite check and cut list (2.8)

* In the hour: <the one core flow, in a sentence>

Every cut becomes a Backlog card and a README known gap (`.claude/harness.md`, `rules_extra`).
In the hour this cut list replaces the full skill's IDEA-card disposal (`lightbulb`): there is
no separate IDEA-card step.

| Cut | Why | Backlog card |
| --- | --- | --- |
| | | <card link, created before the PR that defers it merges> |

## 9. Concept (3.2)

One concept.

| Element | Description |
| --- | --- |
| Name | |
| One-liner | |
| How it works | <two or three short paragraphs> |
| Key interaction | <the primary way the user interacts> |
| Why it might work | <the job layer and the principle it serves> |
| Why it might fail | <the risks, and which assumptions in section 3> |
| Kano category | Basic / Performance / Excitement |
| Share unit | <only if the shareability or game-and-league module is selected; else N/A> |

## 10. Core flow (3.4)

The critical path only, with its alternative outcomes and the "when wrong" paths (an error,
an empty state).

```
[Entry] -> [Step 1] -> [Decision] -> [Step 2a] -> [Outcome]
                                  \-> [Step 2b] -> [Alternative outcome]
```

Returning-visitor leg (required): the user reloads or comes back later, per auth mode
(signed in, signed out), and finds the state they left.

```
[Return / reload] -> [<what they see>] -> [<state that persisted>]
```

## 11. Breadboard (3.9)

Places, affordances and connections; no visual design.

```
[Place]
  affordance -> [Place]
```

Per key screen:

| Screen | Purpose | Key elements | Primary action | Data shown | Entry | Exit |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

## 12. Data model (3.11)

The record is `docs/architecture/data-model.md` with its rows in
`docs/architecture/data-dictionary.yml`, written at `/timebox` step 7 after the Design gate
and reviewed by `data-model-reviewer` before Gate 1. Here, only the entities the breadboard's
"Data shown" column needs, each traced to a screen or a flow step, with its owner. Or N/A:
persists nothing (section 1, step 0.4).

| Entity | Traced to | Owner of the fact | Personal data? |
| --- | --- | --- | --- |
| | | | |

## 13. Modules (3.3)

Only the modules selected at step 0.4, each filled as its file in `docs/design/modules/` says.
Or N/A: none selected.

## 14. User stories (4.5)

One per step of the core flow, the returning-visitor leg included. They become the acceptance
criteria of `docs/specs/product-spec.md` (`/timebox` step 6, after the gate). That spec is
the trace for 4.4 design specification: it stands in, written from these 4.5 stories.

> **As** <persona>, **I want to** <action>, **so that** <outcome>.
> Acceptance: Given <context>, when <action>, then <result>. Feels like <principle>.

## 15. Critique (4.2)

* Review file: `docs/design/reviews/<date>-critique.md` (the `design-critic` report, verbatim)
* Verdict line, quoted: <VERDICT: ...>
* Disposition of every S3: fixed in this file before the gate; or, after one fix and one
  re-critique, taken by the owner at the Design gate as a cut (cut list, Backlog card) or as
  an accepted bet logged in section 3, citing the critique file. One line each.
* Disposition of every S2: the spec's rabbit holes, with an owner. One line each.

## 16. Handoff checklist (4.8, the items the hour can meet)

* [ ] Every section filled, or N/A with a reason
* [ ] Every story traces to a step of the core flow, a principle and the problem statement
* [ ] The hypothesis signal is measurable and says how it is read
* [ ] Four risks re-read: each retired or written down as an accepted bet
* [ ] Appetite respected; every cut on the list has a Backlog card
* [ ] Modules run are named, or none
* [ ] Data model entities listed here; the record and dictionary follow at step 7, reviewed before Gate 1
* [ ] Critique verdict APPROVE quoted, or the owner's disposition of each remaining S3 recorded; every S2 owned in the spec's rabbit holes
* [ ] The slice list for the spec follows the core flow, schema first (Group 0)

Full-skill 4.8 items the hour does not meet, each stated: HEART targets (2.5 skipped);
brand integration notes (unless the brief carries a brand guide); a design specification on
the full template (the product spec stands in); companion skills present (not a product-repo
check).

## 17. Skipped steps and why

Pre-filled from the Timebox depth row of `product-design` v2.6.0. Change a line only to say
the step ran after all, and with what.

* 1.1 research plan, 1.2 user research, 1.8 synthesis: no users are reachable in an hour;
  step 0.7 says so.
* 1.4 competitive landscape, 1.5 current-state journey, 1.6 stakeholder needs: only if the
  brief carries them, then as inputs in step 0.8. <carried / not carried>
* 2.5 HEART: the hypothesis signal (section 7) stands in.
* 2.6 Kano and the opportunity tree, 2.7 riskiest-assumption tests: the assumptions stay
  accepted bets (section 3).
* 3.1 How Might We: one concept, so nothing to diverge across.
* 3.5 information architecture, 3.6 interaction patterns: the breadboard carries the places
  and connections the hour needs.
* 3.7 brand integration: skipped only if the brief has no brand guide; otherwise it runs as
  the one line of brand constraints in section 1, and its banned words go into the copy pass
  (`docs/design/copy-pass.md`). <skipped: no brand guide / ran>
* 3.8 visual direction: code is the rung reached; the build's own styles stand in.
* 3.10 assumption tests: 2.7 is skipped, so there is nothing to run.
* 4.1 decide: one concept, nothing to score.
* 4.3 fidelity ladder: code is the rung reached, walked once by the owner, not tested with
  five users.
* 4.6-4.7: the spec's slices and the template's defaults carry them.
* Modules not selected at step 0.4 do not run.
