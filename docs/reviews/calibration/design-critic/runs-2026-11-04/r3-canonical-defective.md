DESIGN CRITIQUE (independent)
Repo: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/dp-review/run-o   Pass: docs/design/design-pass.md@working file (no ref named)   Modules read: none (pass 0.4 says "None"; matches the dispatcher, which named none)   Checklist rows run: 18 of 18

TRACE
- 8 of 8 traced to a core-flow step and a [brief] line (screens: Sign in, No house, Create house, This week; stories: create house, join, tick, see turns). Untraced on principle: Sign in (section 11), which is a precondition, not a feature (S0). Every trace to the problem statement (section 4) is void until 2.1 is restated: the statement names a spreadsheet, and no screen or story builds one (see S3 below). The breadboard table (section 11) has no Sign in row, though the breadboard text has one.

CHECKLIST
- [PASS] row 1, Visibility of status -- section 10 save states ("Saved: ticked, by me, at time", "not saved, Try again"); S0: This week shows no date range or rotation day (section 11 key elements)
- [PASS] row 2, Match to the real world -- section 9/10 copy uses the house's own words ("bins", "free this week", "your turns start on Monday")
- [FAIL] row 3, Control and freedom -- section 8 cuts leaving a house, and section 10 has no way back from a mistaken join; S1 (bounded by the code-match rule, but the flow does not design it)
- [PASS] row 4, Consistency -- tick and untick behave the same on the one list screen (sections 10, 11, 14)
- [FAIL] row 5, Error prevention -- section 11 Create house accepts "chores (one per line)" with nothing on an empty list or duplicate names; section 10 does not say what happens when a member who already has a house enters a second code (the second house is cut in section 8)
- [PASS] row 6, Recognition over recall -- the join code stays on This week (sections 10, 11)
- [FAIL] row 7, Flexibility -- no path at all for a returning member: section 10 has two "no" branches out of [Has a house?] and no "yes" branch, and section 11 sends [Sign in] only to [No house]
- [PASS] row 8, Minimalism -- This week carries only chores, owners, done state and the code (section 11)
- [PASS] row 9, Error recovery -- bad join code and failed save are both designed with what to do (section 10)
- [PASS] row 10, Help -- the help sits inline where the problem is ("Check it with whoever sent it", "Your turns start on Monday")
- [FAIL] row 11, Traceability -- section 4 names a spreadsheet the concept does not build; section 0.6 [decision] says the creator may pick a timezone, but Create house (section 11) has no timezone field; This week shows display names (section 11) that no screen collects (Sign in is "email + password" only, and the sign-up section 9 mentions has no screen)
- [PASS] row 12, Principle tension -- section 6: three principles, each rules something out, P2 vs P3 written; S0: the P1/P3 trade is described as a swap trade, which is really P1 against flexibility, not against "fair is visible"
- [FAIL] row 13, Four risks -- section 1 risk table: all four risks are written as bets with kill facts, and A1/A2 carry falsifiers (section 3), but the Usability row's A3 ("sign in on their phones without help") is not the A3 in section 3 ("Joining by a code is enough"); the Viability kill fact "Nobody asks for reminders after a month" has no channel that would observe it
- [FAIL] row 14, Appetite -- section 8: the scope plausibly fits the hour, but all five cuts read "(card created at the gate)" and none has a Backlog card; section 16 leaves that item unchecked
- [N/A] row 15, Brand -- section 1 line 3.7: the brief has no brand guide
- [N/A] row 16, Share unit -- no shareability module selected (0.4, section 9 "Share unit N/A")
- [N/A] row 17, User-generated content -- house, chore and display names are user-authored but visible only to members of the house; nothing is public
- [PASS] row 18, Data model -- section 12 lists House, Member, Chore and Tick, each traced to a screen or flow step with one owner, and marks personal data on Member and Tick; the weekly snapshot can be derived from Member.joined_at/left_at. S0: the House timezone column has no screen that writes a non-default value (see row 11)

FINDINGS
- S3 section 4 (2.1) -- the problem statement's need is a product shape ("needs a shared spreadsheet with a column per housemate"), and its own checkbox "[x] Describes a need, not a solution" is false; every later trace, including section 16's "[x] Every story traces to ... the problem statement", is therefore void, and the shape conflicts with P1 (a hand-kept spreadsheet is the "editing whose turn it is by hand" that P1 rules out).
- S3 section 10 (3.4) -- the core flow has no returning-visitor leg: [Has a house?] has two "no" branches and no "yes" branch, the breadboard (section 11) routes [Sign in] only to [No house], This week's Entry column lists only "create, join", and no story (section 14) has a criterion for signing back in and finding this week's turns and ticks persisted; no acceptance criterion and no test will cover the leg every user hits from day two.
- S2 section 5 (2.2) -- the persona is generic: "busy young professional", no "would NOT want" items, three unranked frustrations with neither a [brief] source nor an [assumption] tag, none of which is the brief's actual pain ("I am sick of being the one who keeps track"); it cannot rule anything out or test a principle.
- S2 section 1 line 0.6 vs section 11 Create house -- the [decision] "Europe/London unless the creator picks another" is not honoured, because Create house has only name and chore list; the week boundary, and so every turn, rests on a field no user can set, and the gap is not on the cut list.
- S2 section 11 This week vs Sign in -- This week shows "members' display names", and section 12 marks display name as personal data, but no screen or flow step collects it (Sign in is email + password; the sign-up in section 9 has no screen); the spec will either invent a step or show emails to the house.
- S1 section 8 -- five cuts, each "(card created at the gate)"; a cut with no Backlog card is not yet a deferral.
- S1 section 1 risk table vs section 3 -- the Usability row cites A3 as "sign in on their phones without help", while section 3's A3 is "Joining by a code is enough"; the phone sign-in assumption has no row, importance or falsifier.
- S1 section 1 Viability row -- the kill fact "Nobody asks for reminders after a month" cannot be observed: there is no outbound messaging and no feedback route; name how asks are collected (for example, the owner asks the test house).
- S1 section 7 vs section 3 A2 -- the hypothesis signal counts ticked chores per week (ticks / chores), while A2's falsifier and the Value kill count housemates who tick; pick one unit, or the week-one read can pass one test and fail the other.
- S1 section 10/11 (row 5) -- an empty or duplicate chore list on Create house, and a second join code entered by a member who already has a house, are undesigned moments.
- S1 section 1 line 0.4 / section 9 -- the join code is the only gate between a stranger and a house's display names and tick history (personal data per section 12), and its length, entropy and attempt limiting are not stated; this belongs at the access rule step 7 says it records, but the pass should name it as a constraint.
- S0 section 0.7 / section 17 -- there is no user research by design at Timebox depth; A1 (other houses share the problem) rests on one house, the owner's.
- S0 section 11 -- the breadboard table omits the Sign in screen that the breadboard text shows.
- S0 section 7 -- the 50 percent threshold is a chosen target and should be tagged [decision].

EVIDENCE AUDIT
- evidence lines: 8 [brief] lines (0.4 x2, 0.8, Value known, Market fit, JTBD functional, JTBD emotional, A3) plus 4 [decision] lines (0.4 modules, 0.6 x2, Viability); assertions: 8 (persona day and its 3 frustrations; "Scope fits the hour"; "a group chat does not show whose turn it is"; "nothing grows faster than houses"; section 4's "the brief's own words", which is false, since no quoted [brief] line names a spreadsheet); assertions the hypothesis depends on: none (A2 is tagged as an accepted bet with a falsifier)

PREMORTEM
- 1. On day two a housemate signs in, lands on No house or a dead end because no path leads a member back to This week, and the house goes back to the paper rota (row 7 / 3.4). 2. Housemates never tick, so the list is as stale as the paper one and the week-one signal reads zero (Value risk / A2). 3. A new member joins mid-week, everyone's chores reshuffle from Monday in a timezone nobody chose, and the house reads the rota as arbitrary rather than fair (row 12 P3 / row 11 timezone decision not honoured).

FOR THE WALK-THROUGH (only a user can answer)
- Does a housemate sign in on a phone from the group-chat code without asking anyone how?
- When a new member joins and everyone's chores shift from Monday, does the house read that as fair?
- Is "free this week" taken as fair rotation or as someone dodging?
- Does a one-tap tick with no detail settle "did you actually do the bins", or does the argument just move?
- Does a housemate know which week "this week" is and when it flips, without being told?
- Would anyone in the house ever say they want reminders, and to whom?

VERDICT: BLOCK
Reason: section 4's problem statement names a solution (a shared spreadsheet), not a need, and section 10's core flow has no returning-visitor leg; each is S3 on its own.
