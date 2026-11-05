DESIGN CRITIQUE (independent)
Repo: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/dp-review/run-m   Pass: docs/design/design-pass.md@working tree (no ref named)   Modules read: none (the pass's 0.4 line selects none; the dispatcher named none, so they agree)   Checklist rows run: 18 of 18
Note: this critic is uncalibrated in this run. I did not read the calibration fixtures, because the dispatcher limited reading to the agent file, the pass and the checklist.

TRACE
- 8 items traced to a core-flow step and a [brief] line: 4 screens (Sign in, No house, Create house, This week) and 4 stories. None of the 8 traces to a valid problem statement, because section 4 names a solution (see the first S3).
- Partial traces: Sign in (section 11) has no principle and no row in the breadboard screen table.
- Missing branch: no screen or story covers the "has a house: yes" branch (section 10).

CHECKLIST
- [PASS] row 1, Visibility of status -- sections 10, 11: tick saved or not saved, "your turns start on Monday", done time shown.
- [PASS] row 2, Match to the real world -- sections 10, 11: "turns", "join code", "free this week"; the week index stays internal.
- [FAIL] row 3, Control and freedom -- sections 8, 10: the chore list cannot be edited after creation, leaving a house is cut and a person can hold only one house. A typo in a chore, or joining the wrong house, cannot be undone.
- [PASS] row 4, Consistency -- sections 10, 11, 14: tick and untick behave the same way everywhere they appear.
- [FAIL] row 5, Error prevention -- section 11: Create house commits a chore list that can never be edited, with no review step. Nothing stops two housemates from each creating a separate house.
- [PASS] row 6, Recognition over recall -- section 11: the join code can be shown again on This week.
- [FAIL] row 7, Flexibility -- sections 10, 11: a returning member has no path at all. Sign in leads only to No house.
- [PASS] row 8, Minimalism -- section 11: This week carries only rows, the free list, the join code and the new-member message.
- [PASS] row 9, Error recovery -- section 10: a bad join code and a failed save each say what went wrong and what to do (sign-in failure: S0 below).
- [PASS] row 10, Help -- section 10: the mismatch message and "Your turns start on Monday" sit where the problem occurs.
- [FAIL] row 11, Traceability -- section 4: the problem statement is a solution, so every trace anchors on it. Sign in has no principle and no table row (section 11).
- [PASS] row 12, Principle tension -- section 6: P1 and P2 each trade against P3, and the trade is written down.
- [PASS] row 13, Four risks -- sections 1, 3: each risk is retired or an accepted bet with a kill fact, and A1 and A2 each have one (labelling defect: S1 below).
- [FAIL] row 14, Appetite -- section 8: all five cuts read "(card created at the gate)" and none has a Backlog card. Section 16 leaves that box unticked.
- [N/A] row 15, Brand -- the 3.7 line names no brand guide.
- [N/A] row 16, Share unit -- no shareability module is selected (0.4, section 9).
- [N/A] row 17, User-generated content -- house, chore and display names are visible only to members of that house. No surface is public.
- [FAIL] row 18, Data model -- section 12 has no account entity for the email and password the Sign in screen collects, though 0.4 names that email as personal data.

FINDINGS
- S3 section 4 -- The problem statement says the housemate "needs a shared spreadsheet with a column per housemate". That is a product shape, and a hand-kept one that contradicts P1 ("the rota keeps itself") and the section 9 concept. The pass's own ticks in sections 4 and 16 ("describes a need, not a solution"; "every story traces to ... the problem statement") are therefore false. Consequence: the spec traces to a solution the concept rejects, and a builder reading section 4 could build a grid that people edit by hand.
- S3 sections 10, 11, 14 -- There is no returning-visitor leg. Both branches of "[Has a house?]" are labelled "no". The breadboard routes Sign in only to [No house], and no story has reload or return-with-persisted-state as an acceptance criterion. Consequence: a member signing in a second time has no designed path to their own rota, and no criterion or test will catch it.
- S2 section 5 -- The persona has no "would NOT want" items. The three frustrations are unranked and carry no [brief] or [assumption] tag, and "busy young professional who likes easy apps" would want any feature. Consequence: the persona cannot rule anything out, and stories naming "Mira" carry no real constraint.
- S2 sections 8, 10 (rows 3, 5) -- Three cuts combine into a lock-in: chore editing, leaving a house and more than one house per person. Create house has no review step. Consequence: one mistyped chore, or joining the wrong house, is permanent in the product, and the house's only way out is to abandon it.
- S1 section 8 -- Five cuts have no Backlog card, only "(card created at the gate)". Consequence: deferred scope has no record until someone remembers to create one.
- S1 sections 1 (0.6) and 11 -- The owner's [decision] says the creator may pick a timezone other than Europe/London, but Create house collects only name and chores. Consequence: the concept does not honour the decision, and every house's week boundary is fixed to London.
- S1 sections 1 and 3 -- The usability risk cites "People sign in on their phones without help (A3)", but A3 is "Joining by a code is enough". Phone sign-in has no assumption row, and the risk's kill fact ("ask how to join") tests the code. Consequence: phone sign-in is an untested assumption filed under the wrong label.
- S1 sections 1, 3, 7 -- The value kill fact and A2 measure housemates ticking in week one, while the hypothesis measures half of chores ticked in each of the first two weeks. Consequence: the pass can be killed and validated on different numbers from the same data.
- S1 sections 9, 12 -- Member carries "left at" and the concept defines when a leave takes effect, but leaving is cut (section 8). Consequence: the build carries schema and rules for a feature it cannot exercise. That logic stays untested until the cut card is picked up.
- S1 section 11 -- Sign in appears in the breadboard sketch but has no screen-table row and no principle trace. Consequence: the entry screen has no stated purpose, elements or exits for the spec to inherit.
- S1 evidence -- These lines are untagged assertions presented as fact: 0.2 "Scope fits the hour"; the differentiation line "a group chat does not show whose turn it is"; and section 4 "the house argues about turns in the group chat" (the brief says "the same argument" and mentions the chat only for sharing a code). Consequence: these read as evidence when they are not.
- S0 section 10 -- A failed sign-in (wrong password, unknown email) is not designed; it may be the template's own behaviour, but the pass does not say so.
- S0 sections 9, 10 -- In week 0 the creator holds every chore until the first Monday. The person "sick of being the one who keeps track" starts by owning the whole list; put this to a user, don't treat it as a defect.
- S0 sections 9, 17 -- Section 17 lists 2.6 Kano as skipped, but section 9 assigns a Kano category ("Performance"). Step 4.4 is neither filled nor listed in section 17; I could not read the full skill to confirm what 4.4 requires.

EVIDENCE AUDIT
- evidence lines: 12 (8 [brief]: 0.4 modules, 0.4 data depth, 0.8, value-risk known, market fit, functional job, emotional job, A3; 4 [decision]: 0.4 modules, 0.6 x2, viability no revenue)
- assertions: 11 (0.2 scope fits; differentiation group-chat claim; problem statement's "needs a shared spreadsheet"; problem statement's "argues in the group chat"; the section 4 tick "supported by all three job layers", while the social layer is only [assumption]; usability "sign in on phones without help" mislabelled as A3; persona role; persona day; three persona frustrations)
- assertions the hypothesis depends on: none directly. The signal rests on A2, which is tagged as an accepted bet. Its framing ("a rota that stays current") inherits section 4, which is a solution, not a need.

PREMORTEM
- 1. Members who come back to the app land on "No house" because no path leads to their rota, so they stop opening it by week two. (returning leg 3.4, row 7)
- 2. Nothing prompts anyone to tick (no reminders, no email, no push), so ticks stop and the list goes as stale as the paper one. (A2, value risk)
- 3. A mistyped chore or a wrong-house join cannot be fixed, so the house gives up and the rota goes back on the fridge. (rows 3 and 5, section 8 cuts)

FOR THE WALK-THROUGH (only a user can answer)
- On your second visit, do you land on your house's week without doing anything, and do you expect to?
- With no reminder, would you open Turns and tick a chore after doing it, and when?
- Does "free this week" read as fair, or as someone getting out of work?
- As the creator, how does it feel to own every chore until the first Monday?
- When someone joins and everyone's turns move round the next Monday, is that fair or confusing?
- Is a code pasted in the house chat enough for you to join on your phone without help?
- Would you accept a one-tap tick as proof that a housemate did the chore?

VERDICT: BLOCK
Reason: Two S3s. The section 4 problem statement names a solution (a hand-kept spreadsheet), and the core flow and breadboard have no returning-visitor leg (both "Has a house?" branches are "no"; no story carries it).
