# Critique checklist

Copied from `product-design` v2.6.0, `references/critique-checklist.md` (claude-skills).
Edits for this repo, nothing else changed: "Phase 3" reads "the design pass"; row 17's
targeting rule is stated without the source product's examples; row 18 points at this repo's
data-model files and reads at Timebox depth; the Timebox note below is added.

A one-page pass over the chosen concept before the spec is written. Run first by the
`design-critic` agent in a fresh context (product-design 4.2), then by two to five human
reviewers if a team exists. Each finding gets a severity: 0 cosmetic, 1 minor, 2 major,
3 blocks the concept.

Source for 1-10: Nielsen's ten usability heuristics
(https://www.nngroup.com/articles/ten-usability-heuristics/). 11-18 are the skill's own
traceability and viability checks; 18 is a presence check, the data model itself is reviewed
by `data-model-reviewer` against `docs/architecture/review-checklist.md` (D1-D12).

**Timebox depth.** The concept is section 9 of `docs/design/design-pass.md`; rows 1-10 are
read against its core flow (section 10), breadboard (section 11) and user stories (section
14), since no screen exists yet.

| # | Check | Ask |
| --- | --- | --- |
| 1 | Visibility of status | Does the user always know what the product is doing and where they are? |
| 2 | Match to the real world | Does it use the user's words and concepts, not the team's? |
| 3 | Control and freedom | Can the user undo, back out, and leave mid-flow without loss? |
| 4 | Consistency | Do the same things look and behave the same everywhere? |
| 5 | Error prevention | Where would a user make a mistake, and is that moment designed? |
| 6 | Recognition over recall | Does the user have to remember anything between screens? |
| 7 | Flexibility | Is there a faster path for the returning or expert user? |
| 8 | Minimalism | What could be removed from the primary screen without loss? |
| 9 | Error recovery | When something goes wrong, does the product say what and what to do? |
| 10 | Help | Is help where the problem is, not in a separate place? |
| 11 | Traceability | Does every feature trace to a user story, a principle, the problem statement, and the research (at Timebox depth: the brief)? |
| 12 | Principle tension | Which design principle did this concept trade off, and is the trade-off written down? |
| 13 | Four risks | Value, usability, feasibility, viability: which are retired, which are accepted bets? |
| 14 | Appetite | Does the concept fit the appetite, or has scope crept since Define? |
| 15 | Brand | Any contradiction with the brand guide? (A contradiction is a revision, not a note.) |
| 16 | Share unit (if module selected) | Does every share unit have a trigger and a format? |
| 17 | User-generated content (if users author anything public) | Does every user-authored surface have a reporting route, a takedown path with a named decider, and the rule on what may be targeted (never people or protected groups)? Is the hosting posture written in plain words? |
| 18 | Data model (always on, if the product persists state) | At the design gate: does section 12 list every entity the breadboard shows, traced to a screen or flow step, with one owner per fact and personal data marked? At Gate 1: does `docs/architecture/data-model.md` exist with its dictionary rows, and is the `data-model-reviewer` verdict recorded? |

Output: a findings list with severities. Severity 3 sends the concept back to the design pass.
Severity 2 findings appear in the spec's rabbit-holes section with an owner.
