DESIGN CRITIQUE (independent)
Repo: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/dp-review/run-y   Pass: docs/design/design-pass.md@working tree (no ref named)   Modules read: none (pass 0.4 selects none; the dispatcher named none, so the two lists agree)   Checklist rows run: 18 of 18

TRACE
- 9 of 9 traced: 4 screens (Sign in, No house, Create house, This week) and 5 stories each trace to a step of the core flow (section 10), a principle (section 6) and the problem statement (section 4). Missing: there is no sign-up or display-name step anywhere. The concept (section 9) says others "sign up", This week (section 11) shows "members' display names", and story 2 (section 14) needs "my name on a chore", but no screen, flow step or story captures either.

CHECKLIST
- [FAIL] row 1, Visibility of status -- section 11: This week shows no week label or dates. With the Monday reset to "all open" (section 10), a returning user cannot tell a new week from lost ticks.
- [PASS] row 2, Match to the real world -- sections 10, 11: rota, turn, chore and bins are the brief's words.
- [FAIL] row 3, Control and freedom -- sections 8, 10, 11: there is no way to leave a house, remove a member, undo a mistaken create or fix a chore typo. The cuts (no chore editing, one house per person) make each of those permanent.
- [PASS] row 4, Consistency -- sections 10, 11 (S0 note below on the breadboard vs screen table).
- [FAIL] row 5, Error prevention -- sections 9, 10: no design for a join that lands mid-week (it reassigns the current week), for two housemates both creating a house, or for a house with fewer chores than members.
- [PASS] row 6, Recognition over recall -- section 11: the join code stays on This week, and whose turn it is is shown, not remembered.
- [PASS] row 7, Flexibility -- section 10: a signed-in return goes straight to This week.
- [PASS] row 8, Minimalism -- section 11: This week carries only the chore, whose turn, done or open, the done time and the code.
- [PASS] row 9, Error recovery -- section 10: the bad-code message and the failed-save "Try again" are both designed.
- [PASS] row 10, Help -- section 10: help sits where the problem is (the bad-code message, the code shown in the one-member empty state). Whether a code alone gets someone to the site is a walk-through question.
- [FAIL] row 11, Traceability -- sections 9, 11, 14: the display name and sign-up have no capture point (see TRACE).
- [FAIL] row 12, Principle tension -- sections 6, 10: P3 rules out "hiding who skipped", yet the concept drops every past week at Monday. That trade against P3 is not written down.
- [FAIL] row 13, Four risks -- sections 1, 3: the usability risk cites A3 as "sign in on phones without help", but section 3's A3 is "joining by a code is enough". Feasibility is marked retired on a rotation rule that does not cover membership change.
- [FAIL] row 14, Appetite -- section 8: all four cuts read "(card created at the gate)", so none has a Backlog card. Leaving a house is neither in scope nor on the cut list.
- [N/A] row 15, Brand -- no brand guide in the brief (sections 16, 17).
- [N/A] row 16, Share unit -- no shareability module selected (0.4; section 9 share unit N/A).
- [N/A] row 17, User-generated content -- the only user-authored text (house name, chore names, display names) is seen only by members of one house. Nothing is public.
- [FAIL] row 18, Data model -- section 12: the account (email, password) on the Sign in screen is not an entity, though 0.4 names email as personal data. The display name has no capture point.

FINDINGS
- S2 section 9 (rows 5, 13) -- The turn is (week + c) mod member count, with members in join order, so every join or leave reassigns the current week, including chores already ticked. Neither story 3's "I cannot tick another member's chore" nor P1 has a rule for that moment, and the feasibility risk is marked retired anyway; in week one (the window the hypothesis measures) the rota reshuffles each time a housemate joins, and a tick can end up on someone else's turn.
- S2 sections 8, 9, 12 (row 3) -- "A member who leaves shifts everyone's turn" is named in section 9 but has no flow, story or cut-list entry, and no member can be removed; an ex-housemate keeps reading names and ticks (personal data) through a join code that never rotates, and stays in the rotation with open chores every week.
- S2 sections 8, 10 (rows 3, 5) -- With "one house per person" and "no chore editing" cut and no leave action, a mistaken or duplicate create (two housemates creating at once) or a typo in a chore is unrecoverable; the user is stuck in the wrong house for good.
- S2 sections 6, 10, 11 (row 12) -- P3 "Fair is visible" rules out hiding who skipped, but "Return after Monday" shows only the new week, all open, and no screen shows a past week; frustration 3 (done or skipped) is served only until Sunday, and the argument the problem statement names comes back over last week.
- S2 sections 9, 11, 14 (rows 11, 18) -- The concept's "sign up", This week's display names and story 2's "my name" depend on a step no screen or story holds; the spec will either invent the screen unreviewed or fall back to showing account emails to housemates.
- S2 sections 9, 14 -- Story 2's acceptance "I see this week's list with my name on a chore" cannot hold when there are fewer chores than members (story 1's three chores in story 4's house of five leave two members with none that week); the criterion becomes a test that either fails or gets written to the wrong behaviour.
- S1 sections 1, 3, 16 (row 13) -- The A3 in the risk table is not the A3 in the assumption map, so the usability assumption is neither mapped nor retired; section 16 ticks "each retired or written down as an accepted bet" anyway.
- S1 sections 1, 3, 7 -- The value kill fact (half of housemates, week one), A2 (half of a house ticks anything, week one) and the hypothesis (half of chores, in each of the first two weeks) are three different measures; with fewer chores than members, "half of housemates" cannot be met as stated, so the bet has no single kill fact.
- S1 section 8 (row 14) -- None of the four cuts has a Backlog card yet; until each does, a cut has no record and nothing brings it back.
- S1 section 9 -- "Week number" and "every Monday" are undefined: calendar week numbers wrap at year end (52 or 53 back to 1), which breaks the modulo rotation's fairness, and Monday's time zone is unstated; the turn becomes ambiguous at the boundary.
- S1 section 11 (row 1) -- This week carries no week label; after the reset a returning user may read "all open" as lost data, which cuts against story 5's "so that I trust the list".
- S1 section 12 (row 18) -- The account entity (email, password) is missing, and the join code, a bearer secret that grants read access to personal data, is not marked sensitive; the data-model record at step 7 would start from an incomplete entity list.
- S1 sections 0.2, 3 (evidence) -- "Scope fits the hour" and A3's "Not riskiest: the brief gives the channel" are assertions presented as fact (the brief's evidence covers the channel for sharing a code, not signing in unaided); both read as retired risks when they are not.
- S0 sections 5, 3 -- The persona would NOT want reminders, yet reminders are the only viability candidate (A4). Not reconciled, but outside the hour.
- S0 sections 9, 17 -- A Kano category ("Performance") is given while 2.6 Kano is listed as skipped.
- S0 section 11 -- The breadboard and the screen table disagree: Sign in has no table row, and the table's "sign out" exit has no action in the breadboard.
- S0 section 6 -- P1's trade is written as against P3, but the swap it gives up is flexibility, not visibility of fairness. P2 vs P3 is the real tension, so row 12's "at least two in tension" still holds.
- S0 process -- I did not read the calibration record (out of scope for this dispatch). Until a calibration run is recorded, the critique file must say this critic is uncalibrated.

EVIDENCE AUDIT
- evidence lines: 11 (brief quotes or brief-sourced lines: 0.4 modules, 0.4 data depth, 0.8, the value risk "Known" cell, market fit, A3's evidence, JTBD functional, JTBD emotional, persona frustrations 1 and 2, persona would-not 1); assertions: 7 (3 tagged [assumption]: the social job, frustration 3, would-not 2; 4 untagged: 0.2 "scope fits the hour", A3's "not riskiest" reasoning, differentiation "a group chat does not show whose turn it is", feasibility "none beyond the template"); assertions the hypothesis depends on: none presented as fact. A1 and A2 are declared bets with kill facts. The signal's validity in weeks one and two also rests on a stable rota, which the pass does not establish (first S2).

PREMORTEM
- 1. Five housemates join over three days in week one; each join reshuffles the week, Mira's tick ends up on someone else's turn, and the house decides the app is no more trustworthy than the paper (row 5, feasibility risk).
- 2. A housemate moves out and cannot be removed; their chores sit open every week, the tick ratio stays under half, the hypothesis reads as failed, and the ex-housemate still sees the house (row 3, value risk / A2).
- 3. On Monday the list resets to all open with no record of last week, so the skipper is invisible and the "who skipped" argument moves straight back to the group chat (row 12, P3).

FOR THE WALK-THROUGH (only a user can answer)
- Given only a code pasted into the house chat, can a housemate find the site, sign up and join without asking anyone?
- Does seeing a tick with a name and time settle "whose turn was it", or do people still argue?
- When Monday resets the list, does anyone look for last week?
- Does a visible record of who has not ticked feel fair, or like being policed (P3 against the emotional job)?
- Do people tick when they do the chore, or in a batch later, and does that matter to them?
- Would anyone in the house actually want reminders, and from whom?

VERDICT: APPROVE
Reason: No S3. The pass exists, the problem statement is a need, the returning-visitor leg is in the flow and in story 5, and sections 4, 10 and 14 are filled; the deciding finding, the rotation reshuffling on every join or leave (S2, section 9), goes to the spec's rabbit holes with an owner, along with the other five S2s.
