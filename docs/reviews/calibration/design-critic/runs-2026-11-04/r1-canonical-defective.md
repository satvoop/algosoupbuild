DESIGN CRITIQUE (independent)
Brief: docs/design/design-pass.md@working copy (Timebox depth; scratchpad run-x)   Portfolio: same file, sections 9-14   Checklist rows run: 18 of 18

Inputs: the agent definition, design-pass.md and critique-checklist.md. Frame 0.4 selects no module, so I read no module file. No transcript, branch or other file was read. Lines in the pass that cite the owner's brief as their source count as [brief] evidence.

TRACE
- Turns: 8 features (sign in, create house, join by code, computed rotation, This week list, tick/untick own chore, done time, show join code). 8 trace to a story or the flow step and a principle. 6 have a research line. Two rules have no line in the brief:
  * The rota ordered by join time (section 9, "members are ordered by when they joined"). The brief only evidences a paper rota that already has an order.
  * Only the turn-holder may tick (section 14, story 3, "I cannot tick another member's chore"). No brief line, and it contradicts the problem statement's "who did each one" (see S2-a).

CHECKLIST
- [FAIL] row 1, Visibility of status -- section 11 This week, "Data shown": no week or dates, and the Monday rollover (section 9) is not visible or timezoned; Turns
- [PASS] row 2, Match to the real world -- sections 9 and 11 use "chore", "turn", "tick", "code". Whether a weekly rotate-everything rule matches how houses actually split chores is a walk-through question; Turns
- [FAIL] row 3, Control and freedom -- section 8 cuts editing the chore list. There is no way to leave a house or remove a member, yet section 9 "Why it might fail" names "a member who leaves". Untick exists (section 9); Turns
- [FAIL] row 4, Consistency -- Frame Usability row cites A3 as "People sign in on their phones without help", but section 3 A3 is "Joining by a code is enough". Section 9 says others "sign up", but section 11 has no sign-up screen. Section 11 table exit "sign out" has no affordance in the breadboard; Turns
- [FAIL] row 5, Error prevention -- section 11 Create house: "chores (one per line)" has no rule for empty, duplicate or zero lines, and the mistake cannot be corrected later (section 8 cut); Turns
- [PASS] row 6, Recognition over recall -- section 11: the join code stays on This week, and the list shows whose turn each chore is; Turns
- [PASS] row 7, Flexibility -- section 10: a returning member with a house lands on This week directly; Turns
- [PASS] row 8, Minimalism -- section 11: This week carries only chore, turn, state, time and code; Turns
- [FAIL] row 9, Error recovery -- section 10 designs bad-code and save-failure. Sign-in failure and forgotten password are not designed, and Frame 0.6 [decision] "no outbound email" removes the usual recovery route; Turns
- [FAIL] row 10, Help -- section 10 "Join code shown": the creator gets a code but no shareable message or link. The usability kill condition ("Housemates ask how to join after receiving the code") sits on exactly this moment; Turns
- [FAIL] row 11, Traceability -- section 5 persona traces to nothing in the brief. Section 4 problem statement is solution-shaped. Two rules have no research line (TRACE); Turns
- [PASS] row 12, Principle tension -- section 6 writes down P1 vs P3 (swaps cut) and P2 vs P3 (a tick proves nothing). One trade is not written: the concept also breaks P3, see S2-d; Turns
- [FAIL] row 13, Four risks -- Frame Feasibility row: "Assumed: None beyond the template", yet the rule's input changes inside the core flow (S3). The Viability kill condition cannot be observed (S2-h); Turns
- [PASS] row 14, Appetite -- section 9 matches the section 8 in-the-hour line; cuts carry cards "created at the gate", and the handoff marks this unchecked. The S3 fix adds scope and must be re-confirmed; Turns
- [N/A] row 15, Brand -- no brand guide in the brief (section 17, 3.7)
- [N/A] row 16, Share unit -- no shareability module selected (0.4, section 9 "Share unit")
- [N/A] row 17, User-generated content -- house, chore and display names are seen only by that house's members; nothing user-authored is public
- [N/A] row 18, Data model -- N/A at Timebox: checked at Gate 1 by data-model-reviewer

FINDINGS
- S3 design-pass.md section 9 "How it works" -- The rotation rule (member = (week number + c) mod member count) takes the member count as input, and the core flow changes that count during week one. Each join reshuffles every assignment for the current week. Ticks keyed (chore, week, member) in section 12 then sit on chores that now show someone else's turn. Story 2's acceptance ("I see this week's list with my name on a chore") cannot be met when chores < members: with story 1's three chores and story 4's house of five, two joiners have no chore. Yet the Frame records feasibility as known with nothing assumed. Consequence: the core mechanism is unstable exactly in the first two weeks the hypothesis measures, and the pass gives no rule for what happens to the week or its ticks on a join (or a leave).
- S2 section 4 Problem statement -- "needs a dashboard of the house's chores with who did each one" names a solution and promises "who did each one". The concept records only that the turn-holder said done (story 3 forbids ticking another's chore), so the [x] "Describes a need, not a solution" is false. Consequence: the anchor every story is traced to cannot tell the right design from the wrong one, and it contradicts the concept.
- S2 section 5 Persona -- Mira is generic ("busy life", "chores take up too much time", "most apps are too complicated"), untagged and traced to no brief line. The brief's people are the one housemate who keeps track and the four who do not update the paper rota (0.8). Consequence: the person A2 depends on, the housemate who does not update the rota, has no persona. Nothing in the design is aimed at changing that person's behaviour.
- S2 Frame Value row vs section 3 A2 vs section 7 -- Three different success lines are recorded: "fewer than half of the housemates ... tick a chore in week one", "under half of a house ticks anything in week one", and "at least half of a house's chores ticked in each of its first two weeks". They use different units (people vs chores) and different windows. Consequence: with fewer chores than members, the value kill fires even at 100% of chores ticked (2 chores, 5 members: at most 40% of housemates can tick), so the bet can pass and fail at once.
- S2 section 9 / section 11 This week vs section 6 P3 -- P3 "Fair is visible" rules out "hiding who skipped", but only the current week is shown. A skipped chore vanishes from view on Monday and rotates to the next person, and the section 2 job statement's "prove I did my share" has no surface. Consequence: the concept breaks a principle without writing the trade down (row 12), and the emotional job "feel the split is fair" goes unserved after week one.
- S2 section 8 cuts and section 9 "Why it might fail" -- There is no leave, remove-member or edit-chores path, and only one house per person. A housemate who moves out keeps getting turns forever, and someone who joins the wrong house cannot get out. Consequence: the rota goes stale the same way the paper one did, which is the Frame's own "What kills it".
- S2 section 11 Sign in / Frame 0.6 [decision] -- The [decision] (no outbound email) is an input. But choosing email + password under it leaves no password recovery and no account verification, and the design does not say so. Consequence: a housemate who forgets a password is locked out of the rota permanently. That lands on the usability bet "sign in on their phones without help".
- S2 section 10 "[Join code shown]" -- What the creator shares (code only, no address or message) is not designed, while the usability kill condition is "housemates ask how to join after receiving the code". Consequence: the usability bet is tested on a moment the design left blank.
- S2 Frame Viability row -- The kill condition "Nobody asks for reminders after a month" has no channel through which anyone could ask: no feedback surface, and no outbound messages [decision]. Consequence: the bet cannot be shown false, which counts as a bet with no kill condition.
- S1 section 9 "week number" -- The week number is unspecified. If it is the calendar or ISO week, it wraps at year end: with 5 members, week 52 gives offset 2 and week 1 gives offset 1, repeating week 51's assignments. Consequence: an unfair repeat once a year, plus an unstated timezone for "every Monday".
- S1 section 11 This week -- The screen shows no week label or reset time. Consequence: a member cannot tell which week they are ticking, or when the list will change.
- S1 Frame Usability row vs section 3 -- "A3" names two different assumptions. Consequence: the riskiest-assumption ranking ("Not riskiest: the brief gives the channel") is applied to a different claim than the one the Frame bets on.
- S1 section 11 breadboard -- There is no sign-up place, though sections 9 and 14 require one, and "sign out" has no affordance. Consequence: the breadboard under-describes the auth places the spec's slices must cover.
- S1 section 11 Create house -- There are no rules for empty, duplicate or zero chores, and the cut on editing makes a typo permanent. Consequence: an avoidable bad first state.
- S1 section 4 checklist and section 16 -- "[x] Supported by all three job layers" rests on a social layer tagged [assumption]. "[x] the brief's own words" is not true of the statement. "[x] Four risks ... each retired or written down" is false for feasibility (S3). Consequence: the handoff ticks claim more than the pass holds.

EVIDENCE AUDIT
- evidence lines: 7. Each is cited to the owner's brief, not tagged [brief]: 0.4 "everyone signs in"; 0.8 five people, paper rota, "nobody updates it"; the Frame Value Known; Market fit "one house"; the section 2 functional quote; the section 2 emotional quote; the section 3 A3 "house chat" quote.
- assertions: 9. Six are section 5 persona claims presented as fact. One is the section 4 "the brief's own words". One is the section 4 "supported by all three job layers". One is the Frame Differentiation "a group chat does not show whose turn it is".
- assertions a hypothesis depends on: none untagged. The section 7 signal rests on A1 and A2, both tagged accepted bets, but its threshold contradicts the two kill conditions (S2).

PREMORTEM
- Turns:
  1. Five housemates join over three days in week one. Every join reshuffles the week, two ticks end up beside someone else's name, and the house decides the app is wrong before it has been used (row 13 feasibility, S3).
  2. The four who never updated the paper rota never tick either. Nothing was designed for them because the only persona was the tracker, so the list is stale by week two (row 13 value, A2, row 11 persona).
  3. A housemate moves out and another forgets a password with no email reset. The ghost keeps getting the bins, the locked-out one stops looking, and the house goes back to the fridge (rows 3 and 9, usability).

FOR THE WALK-THROUGH (only a user can answer)
- Does your house rotate every chore one person along each week, or do some chores have fixed owners or different frequencies (bins weekly, bathroom fortnightly)?
- When you cover a housemate's chore, what should the list show?
- What would make the housemates who never updated the paper rota open this and tick?
- When a chore is skipped, should it stay with the person who skipped it next week?
- Does join order make sense as your rota order, or does the house already have one?
- What do you paste into the house chat so someone can join without asking you how?
- Would you ever look back at last week's list, and what for?
- If you forgot your password, what would you do?

VERDICT: BACK TO THE PASS
Reason: S3 at section 9. The rotation rule's member count changes during the week-one join flow, so assignments and ticks reshuffle mid-week, and story 2's acceptance cannot be met when chores < members, while feasibility is recorded as retired with nothing assumed.
