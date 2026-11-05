DESIGN CRITIQUE (independent)
Repo: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/dp-review/run-s   Pass: docs/design/design-pass.md@working tree (no ref named)   Modules read: none (0.4 selects none; matches the dispatcher)   Checklist rows run: 18 of 18

Calibration note: the only files I was allowed to read were the agent file, the pass and the checklist, so I could not see any recorded calibration run. Treat this critic as uncalibrated for this critique.

TRACE
- 8 of 9 traced (4 breadboard screens: Sign in, No house, Create house, This week; 5 stories in section 14). Untraced: Sign in (section 11). It maps to flow step [Sign in] and to [brief] "everyone signs in", but no story in section 14 covers it and no principle in section 6 does either. Sign-up has no screen at all, although section 9 says "Others sign up and enter the code".

CHECKLIST
- [FAIL] row 1, Visibility of status -- section 11: This week does not show which week it is or when the rota next turns over. The brief's complaint is a rota that "still shows last month" (section 5).
- [PASS] row 2, Match to the real world -- sections 10, 11 (chores, turn, free this week, join code).
- [FAIL] row 3, Control and freedom -- sections 8, 11: Create house has no way back to No house, and with "Leaving a house" cut, a wrong join or a mistaken create can never be undone.
- [PASS] row 4, Consistency -- sections 10, 11.
- [FAIL] row 5, Error prevention -- section 11: No house offers create next to join, and nothing stops a second housemate creating a duplicate house.
- [PASS] row 6, Recognition over recall -- section 11 (the join code stays on This week; the mid-week joiner gets a message).
- [PASS] row 7, Flexibility -- section 10 (a returning user goes straight to This week).
- [PASS] row 8, Minimalism -- section 11.
- [FAIL] row 9, Error recovery -- section 10: a bad code and a failed save are designed. A failed sign-in and an empty or invalid Create house submission are not.
- [PASS] row 10, Help -- section 10 (the messages appear where the problem happens). Whether a code alone is enough is a walk-through question, listed below.
- [FAIL] row 11, Traceability -- sections 11, 12, 14: sign-in/sign-up and the display-name input have no story, and sign-up and the display-name input have no screen.
- [PASS] row 12, Principle tension -- section 6 (P2 against P3 is a real tension and the trade is written down).
- [FAIL] row 13, Four risks -- sections 1, 3, 7: A3 means two different assumptions in two tables, and the A2 and Value kill facts can fire by construction.
- [FAIL] row 14, Appetite -- section 8: none of the five cuts has a Backlog card yet (section 16 leaves this box unticked).
- [N/A] row 15, Brand -- the 3.7 line in section 1 names no brand guide.
- [N/A] row 16, Share unit -- no shareability module selected (0.4, section 9).
- [N/A] row 17, User-generated content -- everything users write (house name, chore names, display names) is seen only by members of the same house. Nothing is public.
- [FAIL] row 18, Data model (section 12 only) -- no account entity, although the Sign in screen shows email + password; left_at traces only to a cut feature; the section does not say whether the week snapshot is stored or derived.

FINDINGS
- S2 sections 6/10/11 -- P3 "Fair is visible" rules out "hiding who skipped", and the job statement says "prove I did my share". Yet the only screen is This week, and after Monday (returning-visitor leg) every chore is open again with no record of last week. The fairness principle holds for seven days at most, so the spec needs either a past-week view or a narrower P3, decided by the owner.
- S2 sections 9/2/5/7 -- the week-0 snapshot is taken at creation, when the creator is the only member. So Mira owns every chore in week 0 while everyone else sees "Your turns start on Monday". Week 0 can last minutes or days, and the pass does not say whether it counts toward the hypothesis's "first two weeks". Day one ("sees whose turn the bins are", section 1) always answers "Mira's": the paper rota's failure again, one person carrying everything. The signal's first week can also fail because of the rule rather than how housemates behave.
- S2 sections 1/3 vs 9/14 -- the Value kill fact and the A2 kill fact count housemates who tick in week one. Members "free this week" have nothing to tick (story 3 forbids ticking another member's chore), so with fewer chores than members the kill fact can fire by construction. The hypothesis (section 7) meanwhile counts chores over two weeks. The RISKIEST bet can be killed by a quirk of the measurement, and the three thresholds cannot all be read from the same data in the same way.
- S2 section 7 (evidence) -- the "at least half" threshold and the two-week window are tagged neither [brief] nor [decision]. The hypothesis verdict rests on numbers nobody owns, so the owner must decide and tag them before the spec copies them in as a criterion.
- S2 sections 9/11/12/14 -- section 9 says joiners "sign up", and This week shows members' display names (section 12, Member.display name). The breadboard has only Sign in (email + password), with no sign-up and no display-name field, and no story covers getting an account. The step every joiner takes, the one usability risk A3 depends on, has no acceptance criterion and so cannot be tested.
- S2 section 1 (0.6 [decision]) vs section 11 -- the owner decided "Europe/London unless the creator picks another", but Create house collects only a name and chores. The concept does not honour a recorded decision: either a timezone picker goes into the hour's scope or the owner revisits the decision.
- S2 sections 8/11 (rows 3, 5) -- "Leaving a house" and "More than one house per person" are cut, the join code is shown permanently and can never be replaced, and there is no way to remove a member. A housemate who creates instead of joining, joins with a wrong or old code, or a stranger holding a leaked code, stays in the rota permanently. The house splits or carries a dead member with no in-product recovery, and a member who never ticks also drags down the hypothesis signal.
- S1 sections 1/3 -- A3 is "People sign in on their phones without help" in the risk table and "Joining by a code is enough; no invite email" in the assumptions table. The usability bet has no single statement and no single kill fact.
- S1 section 8 -- all five cuts show "(card created at the gate)". A cut with no Backlog card has no record, so nothing will bring it back up.
- S1 section 11 (row 1) -- This week lists no date range and no next-rotation time. Users cannot tell the list is current, which is the very failure the brief describes.
- S1 section 10 (row 9) -- there is no designed state for a wrong password, an empty chore list, or a missing house name. The spec will invent them without a design line behind them.
- S1 section 12 (row 18) -- the account (email and credential, the personal data declared at 0.4) is not listed. Member.left_at serves only a cut feature. The pass does not say whether the week snapshot is stored or derived from joined_at/left_at, or whether untick deletes the Tick row or records a new one, which decides whether the signal in section 7 double-counts. The data-model record at step 7 has gaps to fill on four facts.
- S1 section 4 -- the box "Supported by all three job layers" is ticked, but the social layer is only an [assumption] (section 2), and "argues about turns in the group chat" is untagged (the brief is quoted only as "house chat to share a code"). The problem statement claims more support than the evidence gives.
- S0 section 6 -- the P1/P3 trade ("a computed rota cannot absorb a swap") is really a trade between P1 and fairness in practice, not P3. The P2/P3 row carries the tension.
- S0 section 3 -- A3's type is "feasibility" but it reads as usability. A4's kill fact ("nobody asks for reminders") has no channel through which anyone could ask.
- S0 section 5 vs section 2 -- frustration 2 quotes [brief] "the same argument every week", while section 2 quotes "every week, the same argument". I cannot check either against the brief; one may be a paraphrase written as a quote.
- S0 sections 1/12 -- the join code is the only thing guarding members' names and tick history. Its strength and rate limiting are a question for data-model-reviewer at Gate 1.

EVIDENCE AUDIT
- evidence lines: 14 ([brief] or [decision] in sections 1, 2, 3 and 5). Assertions: 13. These are: 0.2 "Scope fits the hour"; the Differentiation line; the social job [assumption]; "in the group chat" (section 4); the section 4 three-layers box; frustration 3 [assumption]; the "she wants an end to arguments" inference; would-NOT-want 2 [assumption]; the hypothesis threshold and window; and the kill-fact numbers in section 1 (Value "fewer than half ... week one", Viability "after a month") and section 3 (A1 "first five houses", A2 "under half ... week one").
- Assertions the hypothesis depends on: section 7 "at least half of a house's chores ticked in each of its first two weeks" (untagged); the section 1 Value and section 3 A2 kill-fact thresholds (untagged, and they conflict with section 7).

PREMORTEM
- 1. The house was created on a Sunday night. Mira held every chore through a few hours of week 0 and half went unticked; in week 1 the "free this week" housemates could not tick, and the bet was declared false on a quirk of the measurement (row 13, A2, Value risk).
- 2. Two housemates both pressed "create" on No house. With no leave and one house per person, the rota split in two, and within a week the house went back to the paper on the fridge (rows 3, 5, Value risk).
- 3. Housemates got a code in the chat but no link, and found no sign-up step and no place to set their name. They stalled before joining, and the house never got past a one-member rota (row 11, Usability risk A3).

FOR THE WALK-THROUGH (only a user can answer)
- With only a code in the group chat, does a housemate know where to go and how to get an account?
- When someone does a chore for someone else, does the house accept that only the assigned member can tick it?
- Does the house need to see last week to feel the split is fair, or is this week enough?
- Does "free this week" feel fair to the members who do have chores?
- Does everyone's turn moving when a new member joins break trust in the rota?
- Is a bare tick, with no detail, enough for Mira to stop checking whether the chore was done?

VERDICT: APPROVE
Reason: No S3 was found: the problem statement is a need, the returning-visitor leg is in the core flow and carried by story 5, and sections 4, 10 and 14 are filled. The deciding finding is the S2 that P3 "Fair is visible" is not honoured past the current week; it and the other six S2s go to the spec's rabbit holes with owners.
