DESIGN CRITIQUE (independent)
Repo: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/dp-review/run-x   Pass: docs/design/design-pass.md@working tree (no ref named)   Modules read: none (pass step 0.4 selects none; matches dispatcher)   Checklist rows run: 18 of 18
Calibration: docs/reviews/calibration/design-critic/ is not present in this root and no calibration run is recorded; this critic is uncalibrated.

TRACE
- 7 of 8 traced (screens: Sign in, No house, Create house, This week; stories 1-4). Every trace ends at a solution-shaped problem statement (see S3, section 4).
- Untraced: Sign in (section 11): on the core flow, but no story, no principle, and missing from the screen table.

CHECKLIST
- [FAIL] row 1, Visibility of status -- section 11: This week shows no week label or rollover time, though the rota changes every Monday (section 9), with no timezone stated
- [PASS] row 2, Match to the real world -- sections 10, 11: chore, turn, tick and join code are the house's own words
- [FAIL] row 3, Control and freedom -- sections 10, 11, 8: there is no way to leave a house or remove a member, and the cut list does not mention either; sign out is an exit with no control for it
- [PASS] row 4, Consistency -- section 11: one working screen, one action pattern
- [FAIL] row 5, Error prevention -- section 9: a mid-week join changes the member count and reassigns every chore for the current week, including chores already ticked
- [PASS] row 6, Recognition over recall -- section 11: the join code can be shown again on This week
- [PASS] row 7, Flexibility -- section 10: a returning user with a house goes straight to This week
- [PASS] row 8, Minimalism -- section 11: one primary screen with one primary action
- [FAIL] row 9, Error recovery -- sections 0.6, 11: sign-in is email + password while outbound email is forbidden, so a forgotten password cannot be recovered. A bad code and a failed save are designed
- [FAIL] row 11, Traceability -- section 4: the problem statement is a product shape; Sign in is untraced
- [PASS] row 10, Help -- section 10: the wrong-code message and the one-member empty state are placed where the problem happens
- [PASS] row 12, Principle tension -- section 6: three principles, each rules something out, and the P2/P3 trade is written down
- [FAIL] row 13, Four risks -- section 1: feasibility is "retired" by an assertion that only holds while membership is fixed; the password-recovery usability risk is not mentioned; the A3 label does not match section 3
- [FAIL] row 14, Appetite -- section 8: the scope plausibly fits the hour, but none of the four cuts has a Backlog card ("card created at the gate")
- [N/A] row 15, Brand -- sections 16, 17: no brand guide in the brief
- [N/A] row 16, Share unit -- sections 0.4, 9: no shareability module selected
- [N/A] row 17, User-generated content -- house, chore and display names are visible only to members of that house; nothing users write is public
- [FAIL] row 18, Data model -- section 12: the account entity (email, password) behind Sign in has no row, although step 0.4 names email as personal data

FINDINGS
- S3 section 4 -- The need is stated as "a dashboard of the house's chores with who did each one", a product shape, while the checkbox beneath it claims "Describes a need, not a solution". The need has also drifted from the functional job (know whose turn it is) to a log of who did what. Every story and screen traces to this statement, so the whole trace rests on a solution, not a need.
- S3 section 10 -- Section 8 puts "come back and find it as you left it" in the hour. The core flow's "yes -> [This week]" branch returns the user, but no step shows them finding their earlier tick as they left it, or reloading mid-session and keeping it. Nothing in the flow carries the persisted-state leg, so no criterion or test will cover it.
- S2 section 14 -- No story carries the returning-visitor leg as an acceptance criterion. It cannot become a spec criterion as written.
- S2 section 5 -- The persona's frustrations are unranked and unsourced, with no [assumption] tags, and there are no "would NOT want" items. The frustrations ("chores take up too much time", "most apps are too complicated") do not match the brief, whose pain is being the one who keeps track and the weekly argument. The persona is generic and cannot rule anything out.
- S2 sections 9, 10, 14 -- The rotation is (week number + c) mod member count, so any join or leave changes every member's turn. Story 2 makes a mid-week join part of the core flow. Section 9 names the leave case as a failure, but no flow step, risk row, cut or story handles a change in membership. A tick made before a join can end up on a chore that now belongs to someone else, which contradicts story 3 ("I cannot tick another member's chore") and P3.
- S2 sections 0.6, 1 -- Sign-in is email + password, and step 0.6 forbids outbound email. There is no password reset or email verification, and the usability risk is not in the table. A returning housemate who forgets their password is locked out for good, which feeds A2 directly (they stop ticking).
- S2 sections 10, 11 -- There is no leave-house or remove-member path, and it is not on the cut list. Anyone holding a leaked join code joins permanently, sees members' display names and ticks, and shifts the rota. Nobody in the house can undo it.
- S2 section 11 -- The Sign in screen has no story or principle and is missing from the screen table (row 11 trace). It is the entry point of the returning leg that is also missing.
- S1 sections 1, 3 -- The risk table's A3 is "People sign in on their phones without help", while section 3's A3 is "Joining by a code is enough". The sign-in assumption has no row in section 3, so its kill fact is not tied to anything.
- S1 sections 1, 3, 7 -- One bet carries three different thresholds. The hypothesis wants half of the chores ticked in each of the first two weeks; the value kill fires if fewer than half of the housemates tick in week one; A2 is false if under half of the house ticks anything in week one. The signal can pass while a kill fact fires, and the reverse, so the readout is ambiguous.
- S1 section 8 -- Four cuts have no Backlog card ("card created at the gate"). Deferred scope has no record until someone remembers to create one.
- S1 section 12 -- The Sign in screen shows an account entity (email, password) that section 12 does not list. The personal-data marking is incomplete going into step 7.
- S1 section 1 (Challenge) -- The differentiation claim compares only a paper rota and a group chat, while step 0.7 says competing rota apps were not surveyed. An assertion is presented as the answer to "why this over the alternatives".
- S1 sections 9, 17 -- Kano category "Performance" is assigned while 2.6 Kano is listed as skipped. It is a classification with no basis.
- S1 sections 10, 14 -- The failed-save "Try again" path is in the flow but in no story's acceptance criterion. The spec will have no criterion for it.
- S1 section 16 -- The handoff checklist ticks "every story traces to ... the problem statement" and "each risk retired or written down as an accepted bet". The S3 and S2 findings above contradict both. The self-certification does not hold.
- S0 section 6 -- P1's stated trade against P3 (swaps are cut) is really a trade against flexibility, not visibility. The P2/P3 tension carries row 12 on its own.
- S0 sections 10, 11 -- The flow has two unlabelled "no" branches and an "Enter join code" step that the breadboard places on the No house screen. The two diagrams should name the same places.

EVIDENCE AUDIT
- Evidence lines: 8 (0.4 "no points, no leaderboard"; 0.4 "everyone signs in"; 0.8 the owner's house; the value risk's Known; the market-fit line; the functional job quote; the emotional job quote; the A3 quote).
- Assertions: 8 (the feasibility Known; the scalability line; the differentiation line; the persona's day; three persona frustrations; the Kano category). The social job and A1-A4 are honestly tagged and not counted.
- Assertions the hypothesis depends on: the feasibility Known, "the rotation is a pure function of week and order" (section 1). The hypothesis's "rota that rotates itself" depends on it, and it holds only while membership is fixed. A2, the core bet, is an honest accepted bet, not an assertion.

PREMORTEM
- 1. A housemate joins on Wednesday, every turn shifts, Mira's Tuesday tick now sits on someone else's chore, and the house is back to arguing in the chat (row 5, feasibility risk).
- 2. Built to "a dashboard of who did each one", the product logs ticks, but nobody opens it to learn whose turn it is, and ticks fall below half by week two (row 11 / section 4, A2).
- 3. Two housemates forget their passwords, have no way to reset them because email is forbidden, stop ticking, and the rota goes as stale as the paper one (row 13 usability, returning leg).

FOR THE WALK-THROUGH (only a user can answer)
- Can you tell from This week which week it is and when the turns next change?
- Would you tick a chore when you do it, or only when someone asks?
- When someone joins and the turns move mid-week, does that read as fair or broken?
- Does seeing who has not ticked feel fair, or like being policed?
- Is ordering turns by when people joined accepted as fair in your house?
- Would you join from a code pasted in the house chat without asking anyone how?

VERDICT: BLOCK
Reason: The problem statement (section 4) states a solution, "a dashboard ...", as the need. That is S3, and every trace in the pass rests on it. The returning-visitor leg is also missing from the core flow (S3, section 10).
