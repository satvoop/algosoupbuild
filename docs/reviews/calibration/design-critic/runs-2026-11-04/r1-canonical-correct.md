DESIGN CRITIQUE (independent)
Brief: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/dp-review/run-y/docs/design/design-pass.md@working-file (Timebox: brief, portfolio and frame in one file)   Portfolio: same file, sections 9-11   Checklist rows run: 18 of 18 (4 N/A)

No modules were selected at step 0.4, so I read no module file. I read no other file.

TRACE
* Turns: 8 of 9 features trace.
  * Create house (story 1, P1, brief "I am sick of being the one who keeps track")
  * Join by code (story 2, P1, brief "we have a house chat to share a code")
  * This week view (story 4, P3, brief "who is on bins this week")
  * Tick and untick own chore (story 3, P2, brief "nobody updates it")
  * Returning visitor (story 5, P1)
  * Computed rotation (section 9, P1, brief "nobody updates it")
  * Sign in (brief "everyone signs in")
  * Join code shown on This week (core flow empty state, story 1)
  * Untraced: sign out (section 11 screen table, Exit column). No story covers it, and the breadboard has no node for it.

CHECKLIST
* [FAIL] row 1, Visibility of status -- section 11 screen table, "Data shown" column. This week shows no week dates and nothing about when the turns move on, so on a Thursday a user cannot tell which week they are looking at or when the reset happens; Turns
* [PASS] row 2, Match to the real world -- section 2 uses the brief's own words (bins, rota, turn); Turns
* [FAIL] row 3, Control and freedom -- sections 8 and 11. There is no way to leave a house, remove a member, edit chores (cut) or own a second house (cut). A creator who mistypes or forgets a chore cannot fix it or start again; Turns
* [PASS] row 4, Consistency -- three screens with one interaction pattern; Turns
* [FAIL] row 5, Error prevention -- section 9 "How it works" and section 11. A join changes the member count mid-week and reassigns every chore. A wrong join cannot be undone. The join code has no stated length and no rate limit; Turns
* [PASS] row 6, Recognition over recall -- the join code is pasted from the chat; Turns
* [PASS] row 7, Flexibility -- a signed-in returning visitor lands on This week (section 10, returning-visitor leg); Turns
* [PASS] row 8, Minimalism -- This week carries only the chore rows and the join code; Turns
* [FAIL] row 9, Error recovery -- section 11 Sign in is "email + password" and step 0.6 says "no outbound email" [decision]. No path is designed for a forgotten password. A failed create house is not designed either; Turns
* [FAIL] row 10, Help -- section 10 "[Join code shown]". The product hands over only a code. How a joiner gets from the chat to the join field depends on whatever Mira writes in the chat, which is the usability kill condition; Turns
* [PASS] row 11, Traceability -- every feature but sign out traces (S0); Turns
* [FAIL] row 12, Principle tension -- section 6 writes down P1 vs P3 (swaps) and P2 vs P3 (proof). The concept also trades P3 against a current-week-only view and does not write it down: on Monday last week's skips vanish (section 10, "the new week's turns, all open"); Turns
* [FAIL] row 13, Four risks -- section 1 risk table. Feasibility is marked Known ("a pure function of week and order"), but the rule also depends on member count, week numbering and timezone. The usability bet cites A3, but section 3's A3 is a different assumption; Turns
* [PASS] row 14, Appetite -- section 8 scope fits the hour and the cuts are listed. Their cards are "created at the gate" (S0). The unlisted gaps are reported under the findings; Turns
* [N/A] row 15, Brand -- no brand guide in the brief (steps 3.7 and 3.8 skipped, section 17)
* [N/A] row 16, Share unit -- no shareability module (section 9, Share unit)
* [N/A] row 17, User-generated content -- house names, chore names and display names are visible only to house members. Nothing user-authored is public
* [N/A] row 18, Data model -- N/A at Timebox: checked at Gate 1 by data-model-reviewer

FINDINGS
* S3 design-pass.md section 9 "How it works" and section 1 Feasibility row -- The rotation "member (week number + c) modulo the member count" is undefined for things every house hits: membership changes mid-week, the ISO week reset at year end (week 52 to week 1 repeats week 51's assignment when there are five members), and the timezone of "every Monday". Yet Feasibility is marked Known and its kill condition ("cannot be stated in one sentence") is treated as met.
  * Consequence: in week one, as housemates join one by one, every join reassigns all of that week's chores. Ticks already stored as (chore, week, member) then show "done, by X" on a chore now assigned to Y. That breaks stories 3 and 4 inside the two-week window the hypothesis is read from, and the rule sets the Tick and assignment schema that step 7 will record.
* S2 design-pass.md section 10 returning-visitor leg, "[the new week's turns, all open]", against section 6 P3 "Rules out: Hiding who skipped" -- After Monday nobody can see who skipped last week.
  * Consequence: the emotional job "prove I did my share" and P3 are not served past seven days, and Mira has no record to point at.
* S2 design-pass.md section 11 Sign in, against step 0.6 "no outbound email" [decision] -- The concept respects the decision but does not design for its consequence: a housemate who forgets their password has no way back in.
  * Consequence: their chores stay open for good, which is exactly the value kill condition ("the rota is as stale as the paper one").
* S2 design-pass.md section 9 "Why it might fail" ("a member who leaves shifts everyone's turn") and section 8 cut list -- Leaving a house and removing a member are neither designed nor on the cut list, so they are unrecorded deferrals.
  * Consequence: a housemate who moves out stays in the rota and keeps every Nth chore permanently open. If they are removed outside the product, every turn shifts.
* S2 design-pass.md section 11 This week ("show join code") and step 0.4 data depth line -- The join code is the only gate to a house's personal data (display names; who did what, when). It is shown permanently, cannot be rotated, and has no member removal behind it.
  * Consequence: a former housemate, or anyone the chat forwards the code to, keeps read access and can join the rota. This needs an owner before the access rule is written at step 7.
* S2 design-pass.md section 7 hypothesis signal, against the section 1 Value kill condition -- The signal counts ticked chores per house; the kill condition counts housemates who tick. When there are fewer chores than members, Mira and one other housemate ticking clears "half of chores" while three of five housemates are absent.
  * Consequence: the signal can pass on the exact pattern the brief describes, one person doing the tracking. With only the owner's house as the test house, nothing else would show it.
* S2 design-pass.md section 3 A1 kill condition ("the first five houses invited") and section 1 Viability kill condition ("Nobody asks for reminders after a month") -- Neither kill condition can be read: the pass names no five houses, no invite route and no feedback route.
  * Consequence: the A1 and A4 bets have kill conditions in name only.
* S1 design-pass.md section 1 risk table, Usability row "People sign in on their phones without help (A3)" -- Section 3's A3 is "Joining by a code is enough", which is evidence-backed. The phone sign-in assumption has no row in the assumption map, so it borrows A3's "not riskiest" status.
  * Consequence: a week-one usability bet is recorded as covered when it has no evidence and no rating.
* S1 design-pass.md section 11 breadboard and screen table -- The breadboard has no sign-up node, the screen table omits Sign in, and the breadboard's "join code -> [This week]" omits the bad-code path that section 10 designs.
  * Consequence: the slice list built from the breadboard will miss sign-up and the join error state.
* S1 design-pass.md section 11 This week "Data shown" -- No week label and no "turns move on Monday" cue (row 1).
  * Consequence: users cannot tell whether a chore that shows open belongs to this week or is stale.
* S1 design-pass.md section 10 "[Join code shown]" -- The product gives a code with no link or join instructions (row 10).
  * Consequence: Mira writes the joining instructions herself, which re-creates the "one who keeps track".
* S0 design-pass.md section 8 cut list "(card created at the gate)" -- The cut cards do not exist yet. The section 16 checkbox is honestly left unticked; they must exist before the build PR merges.
* S0 design-pass.md section 11 sign out -- An exit with no story and no breadboard node.

EVIDENCE AUDIT
* Evidence lines: 7. All are operator-stated brief quotes: "no points, no leaderboard"; "everyone signs in"; the five-person house with a fridge rota and "nobody updates it"; "who is on bins this week, every week, the same argument"; "I am sick of being the one who keeps track"; "we have a house chat to share a code"; "the same argument every week".
* Assertions: 10.
  * Social job
  * Frustration 3
  * The reminders "would not want"
  * A1
  * A2
  * A4
  * Phone sign-in without help
  * "a pure function of week and order"
  * "Each house is a few rows a week"
  * "a group chat does not show whose turn it is"
* Assertions a hypothesis depends on:
  * A2 (housemates tick): labelled and accepted as a bet; acceptable.
  * Stable turn assignment, presented as Known in the Feasibility row: presented as fact (part of the S3).
  * Phone sign-in without help: mislabelled as A3 (S1).

PREMORTEM
* Turns:
  1. Housemates joined over the first three days, each join reshuffled the week, two people did the bins and one did nothing, and the argument moved from the fridge into the app (row 13 feasibility, row 5).
  2. A housemate forgot their password on day nine, there was no reset without email, their chores sat open, and the list looked as stale as the paper one (row 9, value risk).
  3. On Monday the skips vanished, Mira had nothing to point at, "fair is visible" turned out to mean only this week, and she went back to policing it in the chat (row 12, P3).

FOR THE WALK-THROUGH (only a user can answer)
* Does your house have chores that come round less often than weekly, and how would you expect those to show?
* When someone covers your chore, what would you expect to do in the app, given you cannot tick theirs?
* Opening This week on a Thursday, can you tell which week it is and when it changes?
* Would you tick at the moment you do the chore, or only when someone asks in the chat?
* Do you want to see last week's skips, or would that make the house worse?
* Starting from only the code in the chat, can you get to the join screen without asking anyone?
* Would the housemates who never touched the paper rota create an email-and-password account for this?

VERDICT: BACK TO THE PASS
Reason: The S3 on section 9's rotation rule. It is undefined for mid-week joins, the year-end week reset and the Monday timezone, so assignments reshuffle inside the two-week window the hypothesis is measured in, and the rule has to be settled before step 7 records the Tick schema.
