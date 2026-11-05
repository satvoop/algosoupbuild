CALIBRATION FIXTURE from docs/reviews/calibration/design-critic: a critic test, never a real design.

# Design pass: Turns (a chore rota for a shared house)

Skill: `product-design` v2.6.0 (Timebox depth)

* Brief: pasted by the owner at minute 0 (lines tagged `[brief]` quote it).
* Drafted: 2026-11-04T10:09:00Z. Design gate approved: not yet asked.

## 1. Frame (Phase 0, steps 1-8)

| Step | Item | Line |
| --- | --- | --- |
| 0.1 | The question | Can housemates see whose turn each chore is this week and mark it done, with no one keeping the list by hand? |
| 0.2 | Appetite | One hour from minute 0 (2026-11-04T10:00:00Z). Scope fits the hour. |
| 0.3 | Decider | The owner. |
| 0.4 | Modules | None. Game-and-league was considered for a fairness score and not selected [decision]: [brief] "no points, no leaderboard". |
| 0.4 | Data depth line | Personal data: yes, an email to sign in and a display name ([brief] "everyone signs in"). Money: no. Agents in production: no. More than one tenant: no; houses are groups of users in one product, isolated by an access rule recorded at step 7. |
| 0.5 | Four risks | The table below. |
| 0.6 | Hard constraints | The template's stack; web only; no outbound email, no push notifications [decision]. Each house keeps its own timezone, Europe/London unless the creator picks another [decision]. |
| 3.7 | Brand constraints | No brand guide in the brief: 3.7 skipped. |
| 0.7 | What is not researched | No users are reachable in the hour: no interviews, observation or synthesis (1.1, 1.2, 1.8). Competing rota apps are not surveyed. |
| 0.8 | Inputs on hand | The owner's brief: [brief] evidence of the owner's own house (five people, a paper rota on the fridge, "nobody updates it"); it only asserts that other houses share the problem. |

| Risk | Known | Assumed | What would kill it |
| --- | --- | --- | --- |
| Value | The owner's house keeps a paper rota that goes stale [brief] | Other houses have the same problem (A1) | Fewer than half of the housemates in a test house tick a chore in week one |
| Usability | Ticking is one action | People sign in on their phones without help (A3) | Housemates ask how to join after receiving the code |
| Feasibility | The rotation is a pure function of the week index and the week's member snapshot (section 9); the stack is in place | None beyond the template | The rotation rule cannot be stated in one paragraph |
| Viability | No revenue in the hour [decision] | A house would pay later for reminders (A4) | Nobody asks for reminders after a month |

| Challenge | Line |
| --- | --- |
| Market fit: is there proven demand? | One house, the owner's [brief]; unproven beyond it (A1). |
| Differentiation: why this over the alternatives? | A paper rota does not rotate itself; a group chat does not show whose turn it is. Turns computes the turn. |
| Scalability: does it scale with the business? | Each house is a few rows a week; nothing grows faster than houses. |
| User value: what measurable improvement? | Every chore this week shows its owner and whether it is done, with no one maintaining the list. |
| Timing: why now? | The owner's house has the problem now; the brief names no wider timing, so this is weak. |
| Why they would pay | Not in the hour; reminders are the candidate paid unit later (A4). |
| What kills it | Housemates do not tick, so the rota is as stale as the paper one. |

* A real workflow with state, or a wrapper around a model call? A workflow with state: chores, turns, ticks.
* What the user does on day one that they could not do before: sees whose turn the bins are this week without asking anyone.

## 2. Jobs to be done (1.3)

| Layer | Job | Source |
| --- | --- | --- |
| Functional | Know whose turn each chore is this week and record that mine is done | [brief] "who is on bins this week, every week, the same argument" |
| Emotional | Feel the split is fair without having to police it | [brief] "I am sick of being the one who keeps track" |
| Social | Be seen by the house as doing my share | [assumption] |

Job statement: When a chore is due in a shared house, I want to see whose turn it is and mark
mine done, so I can stop arguing about it and prove I did my share.

## 3. Assumptions (1.7)

| # | Assumption | Type | Important? | Evidence in hand | RISKIEST: accepted bet, and what would show it false |
| --- | --- | --- | --- | --- | --- |
| A1 | Other shared houses keep a rota that goes stale | desirability | yes | none beyond the owner's house | RISKIEST. Bet accepted. False if the first five houses invited do not create a rota. |
| A2 | Housemates will tick a chore when they do it | desirability | yes | none | RISKIEST. Bet accepted. False if under half of a house ticks anything in week one. |
| A3 | Joining by a code is enough; no invite email | feasibility | yes | [brief] "we have a house chat to share a code" | Not riskiest: the brief gives the channel. |
| A4 | Reminders are what a house would pay for | viability | no (not in the hour) | none | Not riskiest for the hour; a Backlog card. |

## 4. Problem statement (2.1)

> **A housemate in a shared house** needs **a shared spreadsheet with a column per housemate**
> because **the paper rota is kept by one person and stops being updated**.
> Currently, **the house argues about turns in the group chat**, which causes **the same
> person to end up tracking everything and resenting it**.

* [x] Describes a need, not a solution.
* [x] Specific enough to design against.
* [x] Supported by all three job layers in section 2.
* [x] The user would recognise it as theirs (the brief's own words, [brief]).

## 5. Persona (2.2)

* Name and role: Mira (fictional), a busy young professional who shares a house.
* Their day: Mira has a busy life and wants things to be simpler. She likes apps that are
  easy to use and save her time.
* Frustrations:
  * Chores take up too much time.
  * Shared houses get messy.
  * Most apps are too complicated.

## 6. Principles (2.3)

| # | Principle | Rules out | Trades against |
| --- | --- | --- | --- |
| P1 | The rota keeps itself | Anyone editing whose turn it is by hand each week | P3: a computed rota cannot absorb a swap, so swaps are cut (section 8) |
| P2 | One tap to say done | A done form, a photo, a comment box | P3: a tick with no detail cannot prove the chore was done well |
| P3 | Fair is visible | Hiding who skipped; a private to-do list | P1 and P2, as above |

## 7. Hypothesis (2.4)

> We believe **houses keeping a rota that stays current** will be achieved if **housemates**
> successfully **tick their own chores each week** with **a rota that rotates itself**. We
> will know this is true when we see **at least half of a house's chores ticked in each of
> its first two weeks**.

How the signal is read after launch: the count of ticks per house per week divided by that
week's chores, from the ticks table. It stands in for HEART (2.5, skipped).

## 8. Appetite check and cut list (2.8)

* In the hour: create a house, join it by code, see this week's rota, tick and untick your own chore.

Every cut becomes a Backlog card and a README known gap (`.claude/harness.md`, `rules_extra`).
In the hour this cut list replaces the full skill's IDEA-card disposal (`lightbulb`): there is
no separate IDEA-card step.

| Cut | Why | Backlog card |
| --- | --- | --- |
| Swapping a turn | Breaks P1 in the hour; needs a rule for who approves | (card created at the gate) |
| Reminders | No outbound messages in the template; candidate paid unit (A4) | (card created at the gate) |
| Editing the chore list after creation | Not on the core flow | (card created at the gate) |
| More than one house per person | Not in the brief | (card created at the gate) |
| Leaving a house | Not on the core flow; the rotation rule already says when a leave would take effect | (card created at the gate) |

## 9. Concept (3.2)

| Element | Description |
| --- | --- |
| Name | Turns |
| One-liner | A house's chores, with whose turn each one is this week, rotating by itself every Monday. |
| How it works | The first housemate creates the house, lists its chores and gets a join code. Others sign up and enter the code; members are ordered by when they joined. A week starts at Monday 00:00 in the house's timezone (Europe/London unless set otherwise); week 0 runs from the house's creation to the first such Monday, and the week index counts weeks since the house was created. At the start of each week (and at creation, for week 0) the members and their order are snapshotted, so a join or a leave takes effect from the next Monday. In week w, with n members in the snapshot, the chore at position c (from 0) goes to member (w + c) mod n. When there are fewer chores than members, the members with no chore that week show "free this week"; with more chores than members, a member gets more than one. Everyone sees the week's list; a member ticks their own chore when it is done and can untick it the same week. |
| Key interaction | Tick your own chore on this week's list. |
| Why it might work | Serves the functional job (whose turn) and the emotional job (no one polices it), P1 and P3. |
| Why it might fail | Housemates do not tick (A2), so the list looks like the stale paper one; a join or a leave reshuffles everyone's turns from the next Monday. |
| Kano category | Performance |
| Share unit | N/A: no shareability module. |

## 10. Core flow (3.4)

```
[Sign in] -> [Has a house?] -> no  -> [Create house: name + chores] -> [Join code shown] -> [This week]
                            \-> no  -> [Enter join code] -> [This week]
[This week] -> [Tick my chore] -> [Saved: ticked, by me, at time]
            \-> [Untick my chore] -> [Saved: open again]
When wrong: a bad join code -> "That code does not match a house. Check it with whoever sent it."
When wrong: the save fails -> the tick is shown as not saved, with "Try again".
Empty: a house with one member -> every chore is theirs, and the join code is shown on the page.
Joined mid-week -> "Your turns start on Monday"; this week's list is shown without you.
Fewer chores than members -> the members with no chore show "free this week".
```

## 11. Breadboard (3.9)

```
[Sign in]
  email + password -> [No house]
[No house]
  create house -> [Create house]
  join code -> [This week]
[Create house]
  name, chores (one per line) -> [This week] (code shown)
[This week]
  tick / untick my chore -> [This week]
  show join code -> [This week]
```

| Screen | Purpose | Key elements | Primary action | Data shown | Entry | Exit |
| --- | --- | --- | --- | --- | --- | --- |
| No house | Get into a house | create button, code field | Join with a code | none | first sign-in | This week |
| Create house | Start a house | name, chore list | Create | none | No house | This week |
| This week | See and record turns | chore rows: chore, whose turn, done or open, done time; members free this week; "your turns start on Monday" for a new member | Tick my chore | chores, members' display names, this week's ticks, join code | create, join | sign out |

## 12. Data model (3.11)

| Entity | Traced to | Owner of the fact | Personal data? |
| --- | --- | --- | --- |
| House (name, join code, timezone, created at) | Create house; This week; the week index | the creating member | no |
| Member (house, user, display name, joined at, left at) | This week, whose turn, the week's snapshot | the member | yes: display name, linked to an account email |
| Chore (house, name, position) | Create house; This week | the house | no |
| Tick (chore, week, member, at) | Tick my chore | the ticking member | yes: who did what, when |

## 13. Modules (3.3)

N/A: none selected (step 0.4).

## 14. User stories (4.5)

> **As** Mira, **I want to** create our house and list its chores, **so that** the rota exists without me drawing it.
> Acceptance: Given I am signed in with no house, when I submit a name and three chores, then I see this week's list with a join code. Feels like P1.

> **As** a housemate, **I want to** join with the code, **so that** I am in the rota.
> Acceptance: Given a valid code, when I enter it, then I join the house, see this week's list and "Your turns start on Monday"; from Monday I am in the rota, on a chore or shown as "free this week" when the house has fewer chores than members. Given a wrong code, then I see the mismatch message and join nothing. Feels like P1.

> **As** Mira, **I want to** tick my chore, **so that** the house can see it is done.
> Acceptance: Given my chore is open this week, when I tick it, then it shows done, by me, with the time; when I untick it, then it shows open. I cannot tick another member's chore. Feels like P2.

> **As** a housemate, **I want to** see everyone's turns and ticks, **so that** nobody argues about whose turn it was.
> Acceptance: Given a house of five, when I open This week, then every chore shows whose turn it is and whether it is done. Feels like P3.

## 15. Critique (4.2)

* Review file: pending (step 6d).
* Verdict line, quoted: pending.
* Disposition: pending.

## 16. Handoff checklist (4.8, the items the hour can meet)

* [x] Every section filled, or N/A with a reason
* [x] Every story traces to a step of the core flow, a principle and the problem statement
* [x] The hypothesis signal is measurable and says how it is read
* [x] Four risks re-read: each retired or written down as an accepted bet
* [ ] Appetite respected; every cut on the list has a Backlog card (created at the gate)
* [x] Modules run are named, or none
* [x] Data model entities listed here; the record and dictionary follow at step 7, reviewed before Gate 1
* [ ] Critique verdict APPROVE quoted, or the owner's disposition of each remaining S3 recorded; every S2 owned in the spec's rabbit holes (pending 6d)
* [x] The slice list for the spec follows the core flow, schema first (Group 0)

Full-skill 4.8 items the hour does not meet, each stated: HEART targets (2.5 skipped);
brand integration notes (no brand guide in the brief); a design specification on the full
template (the product spec stands in); companion skills present (not a product-repo check).

## 17. Skipped steps and why

* 1.1 research plan, 1.2 user research, 1.8 synthesis: no users are reachable in an hour;
  step 0.7 says so.
* 1.4 competitive landscape, 1.5 current-state journey, 1.6 stakeholder needs: not carried
  by the brief beyond the paper rota (step 0.8).
* 2.5 HEART: the hypothesis signal (section 7) stands in.
* 2.6 Kano and the opportunity tree, 2.7 riskiest-assumption tests: the assumptions stay
  accepted bets (section 3).
* 3.1 How Might We: one concept, so nothing to diverge across.
* 3.5 information architecture, 3.6 interaction patterns: the breadboard carries the places
  and connections the hour needs.
* 3.7 brand integration: skipped only if the brief has no brand guide; otherwise it runs as
  the one line of brand constraints in section 1, and its banned words go into the copy pass
  (`docs/design/copy-pass.md`). Skipped: no brand guide.
* 3.8 visual direction: code is the rung reached; the build's own styles stand in.
* 3.10 assumption tests: 2.7 is skipped, so there is nothing to run.
* 4.1 decide: one concept, nothing to score.
* 4.3 fidelity ladder: code is the rung reached, walked once by the owner, not tested with
  five users.
* 4.6 component inventory: the spec's slice list stands in. 4.7 brand and design-system
  integration: as 3.7.
* Modules not selected at step 0.4 do not run.
