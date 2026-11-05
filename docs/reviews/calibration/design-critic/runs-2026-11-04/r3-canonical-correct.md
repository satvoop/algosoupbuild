DESIGN CRITIQUE (independent)
Repo: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/dp-review/run-n   Pass: docs/design/design-pass.md@working-tree (no ref named)   Modules read: none (the pass's 0.4 line says "None"; the dispatcher's list was also none, so they agree)   Checklist rows run: 18 of 18

TRACE
- 9 of 9 traced (4 screens: Sign in, No house, Create house, This week; 5 stories). Each one traces to a section 10 flow step, a section 6 principle (Sign in only through the returning-visitor leg, P1), the section 4 problem statement and a [brief] line.
- Two things the pass promises have no screen: (a) the creator choosing a timezone (0.6 [decision], section 9) appears in neither the Create house breadboard (section 11) nor story 1 (section 14); (b) the display name (0.4 data line, section 12 Member, shown on This week in section 11) is never collected, because the breadboard and flow have only "Sign in: email + password" and no sign-up step, even though section 9 says "Others sign up".

CHECKLIST
- [PASS] row 1, Visibility of status -- section 10 "Saved: ticked, by me, at time", "not saved, with Try again", "Your turns start on Monday"
- [PASS] row 2, Match to the real world -- sections 9-11 use the house's own words: turn, bins, free this week, join code
- [FAIL] row 3, Control and freedom -- section 8 cuts both "Leaving a house" and "More than one house per person", so anyone who joins the wrong house with a valid code is stuck there for good. Untick is covered (section 10).
- [PASS] row 4, Consistency -- section 11: one primary screen, tick and untick behave the same everywhere
- [FAIL] row 5, Error prevention -- section 10/11 join goes straight from the code to This week without showing which house the code belongs to. Create house (name, chores one per line) has no designed state for zero chores or a blank name.
- [PASS] row 6, Recognition over recall -- section 11 shows the join code on This week, so nobody has to remember it
- [PASS] row 7, Flexibility -- section 10 returning-visitor leg lands straight on This week
- [PASS] row 8, Minimalism -- section 11 This week carries only chores, owner, state, free members and the code
- [PASS] row 9, Error recovery -- section 10 bad-code message says what to do and save failure offers "Try again". The undesigned sign-in and create-house errors are logged under row 5 and S1 below.
- [FAIL] row 11, Traceability -- sections 0.6/9 vs 11 (no timezone choice on any screen); sections 0.4/12 vs 11 (no display-name capture, no sign-up step)
- [PASS] row 10, Help -- help sits at the point of the problem: the bad-code message and "Your turns start on Monday" (section 10)
- [PASS] row 12, Principle tension -- section 6: three principles, each rules something out, P1/P3 and P2/P3 trades written, swaps cut in section 8
- [PASS] row 13, Four risks -- section 1 risk table: each risk is known or written as an accepted bet with a kill fact, and A1/A2 carry falsifiers in section 3 (the cross-reference errors are S1 below)
- [FAIL] row 14, Appetite -- scope fits the hour (section 8 "In the hour"), but all five cuts read "(card created at the gate)", so no Backlog card exists yet (S1)
- [N/A] row 15, Brand -- the 3.7 line in section 1 names no brand guide
- [N/A] row 16, Share unit -- no shareability module selected (0.4; section 9 "Share unit: N/A")
- [N/A] row 17, User-generated content -- users author house names and chore names, but members of the same house are the only ones who see them; nothing is public
- [PASS] row 18, Data model (Timebox, Design gate) -- section 12 lists House, Member, Chore and Tick, each traced to a screen or flow step, with one owner per fact and personal data marked on Member and Tick. The account/email row is implied ("linked to an account email") and not listed (S0).

FINDINGS
- S2 section 7 vs section 9 -- the hypothesis reads "half of a house's chores ticked in each of its first two weeks", but week 0 runs only from creation to the first Monday (possibly hours long) and its snapshot holds only the creator, so the first measured week tests one person over a partial week; the go/no-go read can falsely kill or pass the bet unless section 7 names the weeks (for example weeks 1 and 2, the first full weeks).
- S2 sections 0.4/12 vs 10/11 -- a display name is personal data the product stores and shows to the whole house, but no flow step or screen collects it and sign-up is missing from the breadboard; the spec will either invent a step or fall back to showing account emails to housemates, which is a privacy defect.
- S2 section 0.6 [decision] / section 9 vs section 11 and story 1 -- the decision "Europe/London unless the creator picks another" has no picker on Create house and no acceptance criterion, so the concept does not honour the [decision] as written; the spec will drop it or build an untested hidden field.
- S2 sections 8 and 10 (rows 3 and 5) -- joining never confirms the house name, and leaving and multi-house are both cut, so one mistyped-but-valid or wrong code locks the account into the wrong house with no way out inside the product; this goes to the rabbit holes with an owner (minimum fix: show the house name before confirming the join).
- S2 sections 0.4, 8 and 11 -- the join code is the only access control for a house, any member can display it, it has no expiry or rotation, and with leaving cut nobody can be removed, so a leaked code gives a stranger permanent sight of housemates' display names and each person's dated chore record (Tick is marked personal in section 12); the four-risks table is silent on this and it needs an owner before Gate 1.
- S1 section 1 risk table vs section 3 -- the usability row cites A3 as "People sign in on their phones without help", but A3 in section 3 is "Joining by a code is enough"; the phone sign-in bet has no assumption row and no evidence.
- S1 section 1 risk table / A2 vs section 7 -- the value kill condition counts housemates who tick ("fewer than half of the housemates"), while the hypothesis counts chores ticked, so the same bet has two different falsifiers.
- S1 section 8 -- the five cuts have no Backlog card yet; under the Timebox rule a cut with no card is S1, so they must exist before the gate.
- S1 sections 10/11 -- the error states for Create house (zero chores, blank name, duplicate chores) and for sign-in (wrong password, an existing email at sign-up) are not designed.
- S1 section 1 Differentiation -- "a group chat does not show whose turn it is" and "Turns computes the turn" are untagged and stated as fact, while 0.7 says rota apps were not surveyed; tag both [assumption].
- S0 section 17 / 0.7 -- there is no user research by design at Timebox depth: every value claim rests on one house, the owner's, as told in the brief.
- S0 section 9 -- a join or leave reshuffles every turn from the next Monday, which can give someone the same chore twice in a row and works against P3 "Fair is visible"; the pass already names this under "Why it might fail".
- S0 section 14 story 2 -- the wrong-code clause has Given/then with no "when".

EVIDENCE AUDIT
- evidence lines: 12 [brief] (0.4 x2, 0.8, value risk, market fit, two job layers, A3, two persona frustrations, one would-NOT-want, problem statement) plus 4 [decision] (0.4 module, 0.6 x2, viability).
- assertions: 7 (social job [assumption]; frustration 3 [assumption]; would-NOT-want 2 [assumption]; differentiation claim, untagged; scalability "a few rows a week", untagged; the persona's day narrative, untagged; the 50% threshold in section 7, untagged and chosen rather than evidenced).
- assertions the hypothesis depends on: none presented as fact. A1 and A2 are tagged accepted bets. The 50% threshold is an untagged target, and its measurement window is the S2 above.

PREMORTEM
- 1. Week 0 measured only the creator over two days, the house "failed" the hypothesis before anyone else was on the rota, and a working product was killed on a miswired signal (section 7; value risk).
- 2. Housemates never ticked (A2), the list looked as stale as the fridge rota by week two, and Mira went back to policing it in the group chat (row 13, value bet A2).
- 3. A code pasted into the wrong chat let an ex-housemate or stranger join, nobody could remove them, and the house abandoned the app over who could see their record (rows 3/5, the access-control S2).

FOR THE WALK-THROUGH (only a user can answer)
- Does a housemate who sees "free this week" read that as fair, or as the app being broken?
- Will people tick a chore at the moment they do it, or only when someone in the chat asks?
- Is a public tick with a time ("done, by me, at 19:42") reassuring, or does it feel like being watched?
- After a new member joins and the turns reshuffle, does the house accept the new order or argue about it?
- Does anyone in the house want to swap a turn in the first fortnight (the cut that most threatens P1)?
- Would a housemate sign up on a phone from a code in the chat without asking anyone how?

VERDICT: APPROVE
Reason: no S3 finding (the problem statement is a need, the returning-visitor leg is in the flow and in story 5, sections 4, 10 and 14 are filled), but the five S2s (week-0 hypothesis window, display-name capture, timezone decision with no screen, wrong-house lock-in, join code as unrevocable access) must each enter the spec's rabbit holes with an owner, and the four S1s are fixed in the pass before the Design gate.
