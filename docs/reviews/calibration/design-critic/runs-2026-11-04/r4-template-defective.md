DESIGN CRITIQUE (independent)
Repo: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/dp-review/run-t   Pass: docs/design/design-pass.md@working tree (no ref named)   Modules read: none (pass 0.4 selects none; the dispatcher named none, so the two agree)   Checklist rows run: 18 of 18

Notes on scope:
* No transcript, card or brief was pasted. The brief reached me only as the pass's [brief] lines.
* Calibration status: I did not check it. The dispatcher limited me to the agent file, the pass and the checklist, so I did not read docs/reviews/calibration/. Treat this critic as uncalibrated unless a recorded calibration run exists.

TRACE
- 7 of 8 traced (4 screens: Sign in, No house, Create house, This week; 4 stories in section 14). Untraced: Sign in (section 11). It has a flow step and a [brief] line ("everyone signs in"), but no story, no principle, and no row in the breadboard screen table.
- Every trace to the problem statement lands on a solution-shaped statement that the concept itself contradicts (see the first S3 finding). Those traces count as formally present but hollow.

CHECKLIST
- [PASS] row 1, Visibility of status -- section 10/11: the tick save shows "ticked, by me, at time", a failed save is shown as not saved, and the mid-week joiner sees "Your turns start on Monday".
- [PASS] row 2, Match to the real world -- sections 10, 11, 14 use the house's own words (chores, turn, bins, "free this week"). Week 0 and the week index stay internal.
- [FAIL] row 3, Control and freedom -- sections 8, 11: a mistyped chore can never be edited, nobody can leave a house, and one house per person. A wrong join or a typo has no way back.
- [PASS] row 4, Consistency -- section 11: tick and untick behave the same on the one list screen.
- [FAIL] row 5, Error prevention -- section 11 Create house: submitting zero chores, a blank line or duplicate chores is not designed.
- [PASS] row 6, Recognition over recall -- section 11: the join code can be shown from This week, so no one has to remember it.
- [FAIL] row 7, Flexibility -- sections 10, 11: there is no path at all for a returning member who already has a house. Sign in always leads to No house.
- [PASS] row 8, Minimalism -- section 11: This week carries only chore rows, free members, the new-member note and the join code.
- [FAIL] row 9, Error recovery -- sections 10, 11 with 0.6: a failed sign-in and a forgotten password are not designed. Under the "no outbound email" [decision] there is no reset route.
- [PASS] row 10, Help -- section 10: the mismatch message and the Monday note sit where the problem occurs.
- [FAIL] row 11, Traceability -- section 4 is solution-shaped, and section 11 Sign in is untraced.
- [PASS] row 12, Principle tension -- section 6: the P2 vs P3 trade is written down. The P1 vs P3 trade is stated loosely: a swap is a P1 conflict more than a P3 one.
- [PASS] row 13, Four risks -- section 1 risk table and section 3: feasibility is retired; value, usability and viability are accepted bets with kill facts; A1 and A2 (RISKIEST) each have a falsifier.
- [FAIL] row 14, Appetite -- section 8: the scope plausibly fits the hour, but none of the five cuts has a Backlog card ("card created at the gate").
- [N/A] row 15, Brand -- the 3.7 line in section 1 names no brand guide.
- [N/A] row 16, Share unit -- no shareability module selected at 0.4 (section 13).
- [N/A] row 17, User-generated content -- house names, chore names and display names are visible only to members of the house. Nothing users write is public.
- [PASS] row 18, Data model (section 12 only) -- House, Member, Chore and Tick cover every entity the breadboard shows, each traced, with an owner and personal data marked. The weekly snapshot can be derived from joined at / left at.

FINDINGS
- S3 section 4 -- The problem statement's need is "a shared spreadsheet with a column per housemate", which is a product shape, and the ticked box "[x] Describes a need, not a solution" contradicts it. Every story and screen traces to a statement the concept (a self-rotating computed rota) does not even serve, so the spec would inherit a false root.
- S3 sections 10, 11, 14 -- There is no returning-visitor leg. Both branches out of "[Has a house?]" are labelled "no", there is no "yes" branch, and the breadboard routes Sign in -> No house every time. No story has an acceptance criterion like "given I ticked earlier, when I return or reload, I see it ticked". No criterion or test will cover a member coming back, which is the product's main use.
- S2 section 5 -- The persona is generic. There are no "would NOT want" items. The three frustrations are unranked, carry neither a [brief] source nor an [assumption] tag, and do not match the brief: the brief's pain is fairness and being the one who keeps track, while the persona's is time, mess and app complexity. A persona this loose cannot rule out any feature, so it does not constrain the spec.
- S2 sections 10, 11 -- Sign-up is missing from the flow and the breadboard, although section 9 says "Others sign up and enter the code", and no screen collects the display name that section 12 marks as personal data and This week displays. The build will invent the first step of every non-creator journey and the personal-data capture, with no design behind either.
- S2 section 11 (row 11) -- The Sign in screen traces to no story and no principle and has no row in the screen table, and the "sign out" exit on This week has no breadboard action. An untraced screen goes into the spec with no acceptance criterion.
- S2 sections 8, 11 (row 3) -- The cuts (edit chores, leave a house, more than one house) together leave no recovery from a chore typo at creation or from joining the wrong house. The cut list records each cut's reason but not its effect on control. A real house hits this in week one, and the build will have no answer for it.
- S2 sections 0.6, 10 (row 9) -- "No outbound email" [decision] means a housemate who forgets their password is locked out, and neither the flow nor the breadboard designs that moment. A lost member falls out of the rotation snapshot but stays in it, and their chores show as never ticked, which hits the hypothesis directly.
- S2 sections 1, 3, 7 -- The hypothesis threshold ("at least half of a house's chores ticked in each of its first two weeks") is untagged, neither [decision] nor [brief], and differs from the value kill fact ("fewer than half of the housemates ... in week one") and from A2's falsifier ("under half of a house ticks anything in week one"). The one signal the hypothesis depends on is measured three ways, so the result cannot be read cleanly after launch.
- S1 section 8 (row 14) -- None of the five cuts has a Backlog card. Cards must exist before the gate, not be "created at the gate".
- S1 section 1 vs section 3 -- The risk table's usability row labels A3 as "People sign in on their phones without help", but section 3's A3 is "Joining by a code is enough", and the row's kill fact tests joining, not sign-in. The sign-in-on-phone bet has no entry in the assumption map.
- S1 section 0.6 vs section 11 -- The [decision] "Europe/London unless the creator picks another" needs a timezone picker, but the Create house screen has only name and chores. As drafted, the concept does not honour that decision.
- S1 section 11 (row 5) -- Create house does not define what happens with zero chores, blank lines or duplicates. With n members and no chores the rotation rule and the hypothesis denominator are undefined.
- S1 section 16 -- The boxes "[x] Every section filled" and "[x] Every story traces to ... the problem statement" are ticked while the persona lacks its required items and the problem statement is a solution. Self-certification that contradicts the body misleads the gate.
- S0 sections 8, 9, 12 -- "Leaving a house" is cut, yet Member carries "left at" and section 9 describes when a leave takes effect. That is harmless if it is intended as forward design, but it should say so.
- S0 section 6 -- P1's "trades against P3" (swaps cut) is really P1 against flexibility. The real written tension is P2 vs P3.

EVIDENCE AUDIT
- evidence lines: 11 (9 [brief] lines: section 1 rows 0.4 x2, 0.8, the value risk, the market-fit challenge; section 2 functional and emotional; section 3 A3; section 4's recognition box. 3 [decision] lines: 0.4, 0.6, viability. The 0.4 modules line carries both tags.)
- assertions: 8 (problem statement: "kept by one person", "argues ... in the group chat"; persona: role and day, plus three frustrations; differentiation: "a group chat does not show whose turn it is"; hypothesis threshold "half ... first two weeks")
- assertions the hypothesis depends on: the untagged "at least half of a house's chores ticked in each of its first two weeks" threshold (section 7), inconsistent with the kill facts in sections 1 and 3

PREMORTEM
- 1. The spec traced every criterion to "needs a shared spreadsheet", the build shipped a computed rota, and the review could not say what problem it solved (row 11, section 4).
- 2. On Tuesday every housemate signed back in, landed on "No house" because the flow had no "has a house: yes" path, and the house went back to the fridge (row 7, returning-visitor leg).
- 3. Two housemates forgot their passwords with no email reset, their chores stayed open every week, the tick rate never reached half, and A2 was killed by a sign-in gap rather than by behaviour (row 9, value risk / A2).

FOR THE WALK-THROUGH (only a user can answer)
- Would you tick a chore the moment you do it, with no reminder of any kind?
- Is a strict join-order rotation fair in your house, or would someone ask for a swap in week one?
- When you come back mid-week, do you expect to land straight on this week's list?
- Does seeing who has not ticked feel fair, or like being shamed in front of the house?
- Would you join from a code posted in the house chat on your phone without asking anyone how?
- If a chore was typed wrong at setup, what would you expect to be able to do about it?

VERDICT: BLOCK
Reason: Two S3s: the section 4 problem statement names a solution ("a shared spreadsheet") rather than a need, and the core flow has no returning-visitor leg (no "has a house: yes" path, no story covering persisted state).
