DESIGN CRITIQUE (independent)
Repo: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/dp-review/run-q   Pass: docs/design/design-pass.md@working tree (no ref named)   Modules read: none (the pass says None at 0.4, and the dispatcher named none, so they agree)   Checklist rows run: 18 of 18

Calibration: the dispatcher limited what I could read, so I did not read the calibration record (docs/reviews/calibration/). Treat this critic as uncalibrated for this run.

TRACE
- 7 of 8 traced (4 screens: Sign in, No house, Create house, This week; 4 stories in section 14). Untraced: Sign in (sections 10/11) has no story in section 14 and no principle in section 6. All 7 "traced" items trace to section 4 only through its "because" clause, because the "need" half of section 4 is a product shape (see the S3 below).

CHECKLIST
- [PASS] row 1, Visibility of status -- section 10 shows "Saved: ticked, by me, at time" and "not saved, with Try again"; the section 11 This week row shows done/open and the done time
- [PASS] row 2, Match to the real world -- sections 10/11 use "chores", "turn", "free this week" and "Your turns start on Monday", which is the house's own language
- [FAIL] row 3, Control and freedom -- section 8 cuts editing chores and leaving a house, and section 11's Create house screen has no back path, so a mistake made at creation is permanent and a member cannot leave
- [PASS] row 4, Consistency -- section 11: one main screen; tick and untick behave the same way on every row
- [FAIL] row 5, Error prevention -- section 11 Create house: an empty or duplicate chore list is not designed; there is no sign-up place, although section 9 says "Others sign up"
- [PASS] row 6, Recognition over recall -- section 11: the join code stays visible on This week ("show join code")
- [PASS] row 7, Flexibility -- section 10: a returning member goes from Sign in -> Has a house? yes -> This week with no detour
- [PASS] row 8, Minimalism -- section 11: This week holds only the chore rows, the free members, the new-member notice and the code
- [FAIL] row 9, Error recovery -- section 10's "When wrong" covers a bad code and a failed save, but not a failed sign-in (wrong password, unknown email)
- [PASS] row 10, Help -- section 10: the bad-code message says what to do and where; "Your turns start on Monday" appears at the point of confusion
- [FAIL] row 11, Traceability -- section 4's need is a solution, so no feature traces to a real need statement; Sign in traces to no story or principle (sections 11, 14)
- [PASS] row 12, Principle tension -- section 6: P1 vs P3 and P2 vs P3 are both written down, and each principle names what it rules out
- [PASS] row 13, Four risks -- section 1's risk table plus section 3: each risk is either known/retired or an accepted bet with a kill fact (the A3 label mismatch is noted below)
- [FAIL] row 14, Appetite -- section 8: all five cuts read "(card created at the gate)", so no Backlog card exists for any cut (section 16 leaves this item unchecked)
- [N/A] row 15, Brand -- the 3.7 line in section 1 says there is no brand guide in the brief
- [N/A] row 16, Share unit -- no shareability module was selected at 0.4 (sections 1, 13)
- [N/A] row 17, User-generated content -- house, chore and display names are seen only by members of the same house; nothing users write is public (sections 9, 11)
- [PASS] row 18, Data model (section 12 only) -- House, Member, Chore and Tick cover everything the breadboard shows, each with one owner and personal data marked; the full record and the data-model-reviewer verdict are owed at Gate 1

FINDINGS
- S3 section 4 -- the problem statement's need is "a shared spreadsheet with a column per housemate", which is a product shape, yet its own checkbox ticks "Describes a need, not a solution" and the concept in section 9 is not a spreadsheet; every later section, and the section 16 tick "every story traces to ... the problem statement", traces to a solution that the pass then contradicts.
- S2 section 5 -- the persona's three frustrations are unranked, carry no [brief] source or [assumption] tag, and none of them is the brief's stated pain ("I am sick of being the one who keeps track", "the same argument"); there is no "would NOT want" item, and "busy young professional who wants things simpler" would want any feature, so the persona cannot rule anything out.
- S2 sections 10/14 -- section 8 puts "come back and find it as you left it" in the hour, and section 10 has a returning sign-in branch (yes -> This week), but no section 14 story carries reload or return with ticks still in place as an acceptance criterion; no spec criterion or test will cover persisted state.
- S2 sections 1/9/7 -- the week-0 snapshot is taken at creation, so the creator alone owns every chore until the first Monday and joiners see "Your turns start on Monday"; this breaks the day-one promise in section 1 ("sees whose turn the bins are this week"), breaks P3 in the first days, and fills the "first two weeks" hypothesis window with a one-person week.
- S2 sections 8/11 (row 3) -- with chore editing and leaving cut and no back path from Create house, a typo in a chore or a wrong house can only be fixed by building a new house; this goes in the spec's rabbit holes with an owner.
- S2 sections 11/14 (row 11) -- Sign in is on the core flow but has no story and no principle; the spec has no acceptance criterion for sign-up or sign-in, although the brief's "everyone signs in" makes it a required screen.
- S1 section 8 -- none of the five cuts has a Backlog card, so as written each cut is a deferral with no record.
- S1 sections 1/11 -- the [decision] "Europe/London unless the creator picks another" is not honoured: Create house collects only a name and chores, so the creator cannot pick a timezone.
- S1 sections 11/12 -- Member.display name is personal data in section 12 and is shown on This week, but no screen in section 11 collects it.
- S1 sections 10/11 (rows 5, 9) -- sign-up, a failed sign-in, and an empty or duplicate chore list at creation have no designed state or message.
- S1 sections 1/3/7 -- the measures of A2 disagree: the value-risk kill is "fewer than half of the housemates tick a chore in week one", A2's kill is "under half of a house ticks anything in week one", and the hypothesis is "half of a house's chores ticked in each of its first two weeks"; three different measures cover one bet.
- S1 sections 1/3 -- the risk table labels "People sign in on their phones without help" as A3, but A3 in section 3 is "Joining by a code is enough"; the phone sign-in assumption appears nowhere in the assumption map.
- S0 section 4 -- the checkbox "Supported by all three job layers" counts the social layer, which section 2 tags [assumption], not [brief].
- S0 section 12 -- Member carries "left at" for a feature that section 8 cuts, and it is not stated whether untick deletes a Tick row or keeps it; the section 7 signal (ticks divided by chores) depends on which.

EVIDENCE AUDIT
- evidence lines: 13 (9 [brief], 4 [decision]); assertions: 8 (the persona's role, day and three frustrations in section 5; "a group chat does not show whose turn it is" in section 1; "the house argues about turns in the group chat" in section 4, where the brief says only "the same argument" and "we have a house chat"; phone sign-in presented under the wrong label in section 1); assertions the hypothesis depends on: none (the hypothesis rests on A2, which is tagged and accepted as a bet, and on the [brief] stale paper rota)

PREMORTEM
- 1. The spec inherited "a shared spreadsheet" as the need, criteria were argued against a shape instead of the problem of one person keeping track, and the build was judged on the wrong question (row 11, section 4). 2. On day one the creator held every chore while everyone else read "Your turns start on Monday"; the keeper was the keeper again, and the house stopped opening the app before the first Monday (row 12/P3, value risk). 3. With no reminders and no notifications [decision], housemates did not tick, and by week two the list was as stale as the paper rota on the fridge (A2, value risk).

FOR THE WALK-THROUGH (only a user can answer)
- Will a housemate open the app and tick a chore right after doing it, with no reminder?
- Does the creator owning every chore until Monday feel acceptable, or like the old job of keeping track?
- Can a housemate join from the code in the house chat, on a phone, without asking anyone?
- Does "free this week" feel fair, or does it start the argument the product exists to end?
- When someone joins and everyone's turns move on Monday, does the house read that as fair or as a bug?
- Of the persona's frustrations, which does a real housemate rank first, and what would they NOT want in a rota?

VERDICT: BLOCK
Reason: The S3 in section 4: the problem statement's need is a solution ("a shared spreadsheet with a column per housemate") that the concept itself contradicts, and every trace in the pass runs through it.
