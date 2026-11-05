DESIGN CRITIQUE (independent)
Repo: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/dp-review/run-p   Pass: docs/design/design-pass.md@working tree (no ref named)   Modules read: none (0.4 selects none; the dispatcher named none, so the lists agree)   Checklist rows run: 18 of 18

Note: this critic's calibration run (docs/reviews/calibration/design-critic/) was outside the files I was allowed to read. I could not verify that it has been recorded, so treat this critic as uncalibrated unless the lead has the record.

TRACE
- 8 of 9 traced (4 breadboard places: Sign in, No house, Create house, This week; 5 stories). Untraced: Sign in (section 11). It is in the breadboard but not in the screen table, no story covers it, and no principle covers it. Its only trace is the flow step and [brief] "everyone signs in". The other 3 screens and all 5 stories each trace to a section 10 step, a section 6 principle, the section 4 statement and a [brief] line.

CHECKLIST
- [PASS] row 1, Visibility of status -- section 10 (ticks show as saved or not saved), section 11 (the "your turns start on Monday" banner)
- [PASS] row 2, Match to the real world -- sections 9 and 10 use "turns", "chores", "free this week", "join code"
- [FAIL] row 3, Control and freedom -- sections 8 and 10: joining a house and the chore list set at creation cannot be undone, and leaving a house and editing chores are both cut
- [PASS] row 4, Consistency -- sections 10, 11 and 14 use the same names and states throughout (the sign-up/sign-in mismatch is covered under row 11)
- [FAIL] row 5, Error prevention -- section 10: submitting Create house with no chores, or with duplicate chores, is not designed; there is no confirm step before an irreversible join or create
- [PASS] row 6, Recognition over recall -- section 11: the join code stays visible on This week
- [PASS] row 7, Flexibility -- section 10 returning-visitor leg: a signed-in visitor goes straight to This week
- [PASS] row 8, Minimalism -- section 11: This week carries only rows, the free list, the banner and the code
- [FAIL] row 9, Error recovery -- section 10: only a bad code and a failed tick save are designed; a failed sign-in, a failed sign-up and a failed create-house save are not
- [PASS] row 10, Help -- section 10: the mismatch message says who to ask, and the mid-week banner sits where the question arises
- [FAIL] row 11, Traceability -- sections 9 vs 10/11/14: section 9 says housemates "sign up", but no flow step, screen or story creates an account or collects the display name; the 0.6 timezone decision has no screen or story
- [PASS] row 12, Principle tension -- section 6: each of P1-P3 rules something out; P1/P3 and P2/P3 are in tension and the trade is written down
- [FAIL] row 13, Four risks -- sections 1, 3 and 7: every risk is retired or bet with a kill fact, but the kill facts and the hypothesis measure different things (see findings)
- [FAIL] row 14, Appetite -- section 8: scope plausibly fits the hour, but all five cuts read "(card created at the gate)", so none has a Backlog card yet
- [N/A] row 15, Brand -- section 1 line 3.7: no brand guide in the brief
- [N/A] row 16, Share unit -- 0.4 selects no shareability module; section 9 share unit is N/A
- [N/A] row 17, User-generated content -- house, chore and display names are visible only to members of that house; nothing users write is public
- [PASS] row 18, Data model (section 12 only) -- House, Member, Chore and Tick cover every fact the breadboard shows, each with an owner and personal data marked; S1 below on the snapshot

FINDINGS
- S2 sections 9/10/11/14 -- Section 9 has housemates "sign up", and section 12 has a display name shown on This week. But the breadboard's only auth place is "Sign in: email + password", no flow step or screen creates an account or asks for a display name, and no story carries either; the first step of every housemate's journey, exactly where risk A3 and its kill fact sit, has no acceptance criterion and will be built without one.
- S2 sections 1 (0.6) vs 11/14 -- The owner's [decision] says "Europe/London unless the creator picks another", but Create house collects only a name and chores, and story 1 says nothing about timezone; the concept does not honour the decision, and no criterion will catch a house outside London rotating at the wrong hour.
- S2 sections 1/3/7 -- The Value kill fact ("fewer than half of the housemates tick... in week one"), A2's kill fact ("under half of a house ticks anything in week one") and the hypothesis signal ("at least half of a house's chores ticked in each of its first two weeks") use different units and windows. Under section 9's rule, week 0 can be an hour long and holds only the creator; the launch read can pass the hypothesis while a kill fact fires, or the reverse, and week 0 skews the signal.
- S2 sections 8/10 (row 3) -- Joining is irreversible: leaving is cut and so is a second house. The chore list is fixed at creation because editing is cut, and neither action has a confirm step. One wrong join, one housemate moving out or one typo in a chore name leaves the rota permanently wrong, which is the stale-paper failure the concept exists to end.
- S1 section 9 -- "the week index counts weeks since the house was created" can be read as 7-day periods from the creation timestamp, which would flip turns mid-week rather than at Monday 00:00. It should say "Monday 00:00 boundaries passed since creation" (house timezone). The feasibility risk is marked retired on the strength of this one-paragraph rule.
- S1 sections 9/12 -- Section 9 says the members are "snapshotted" each week, but section 12 has no snapshot entity; the pass should state that the snapshot is derived from Member joined_at/left_at, or add the entity.
- S1 section 8 -- None of the five cuts has a Backlog card yet; each must exist before the gate (the 4.8 checklist in section 16 correctly leaves this unchecked).
- S1 section 10 (rows 5, 9) -- An empty or duplicate chore list at Create house, a failed sign-in, a failed sign-up and a failed create-house save have no designed state.
- S1 section 4 -- "the house argues about turns in the group chat" is presented as the brief's own words, but the brief lines quote "the same argument" and "a house chat" separately; the combined claim is an inference presented as a quote.
- S0 section 12 -- Member carries "left at" for a feature that is cut (section 8). It is harmless, but it is schema for unbuilt scope.
- S0 section 12 -- House is marked "personal data: no", but a house name is often a street address.
- S0 section 11 -- The returning-visitor leg and the This week exit use sign out, but no sign-out action appears in the breadboard.

EVIDENCE AUDIT
- evidence lines: 16 (12 [brief], 4 [decision]); assertions: 6 (3 tagged [assumption]: the social job, persona frustration 3, persona "would NOT want" reminders; 3 untagged: the problem statement's group-chat clause, feasibility's "the stack is in place", usability's "Ticking is one action"); assertions the hypothesis depends on: none presented as fact (A2 is tagged as an accepted bet with a kill fact)

PREMORTEM
- 1. Housemates never tick, the list looks exactly like the stale fridge rota, and the owner goes back to the group chat by week two (risk Value / A2, row 13). 2. Housemates given the code stall at an account step the design never drew, half the house never joins, and the rota is a two-person list (row 11 / A3). 3. A housemate moves out or someone joins by mistake, nobody can remove them, turns keep landing on a ghost, and the house abandons it (row 3).

FOR THE WALK-THROUGH (only a user can answer)
- Given only the join code in the house chat, can a housemate get from the link to this week's list without asking anyone?
- Does "free this week" read as fair, or as someone getting off lightly?
- When a new member joins and everyone's turns move on Monday, does the house accept it or argue about it?
- Is a tick with no detail enough for Mira to stop checking whether the bins actually went out?
- Would the house tick a chore at the moment they do it, or not at all?

VERDICT: APPROVE
Reason: No S3. The problem statement is a need, the returning-visitor leg is in the flow and carried by story 5, and sections 4, 10 and 14 are filled. The deciding findings are the four S2s (sign-up/display name missing, timezone decision not surfaced, inconsistent kill facts vs hypothesis, irreversible join/create), and each must enter the spec's rabbit holes with an owner; the S1s are fixed in the pass before the gate.
