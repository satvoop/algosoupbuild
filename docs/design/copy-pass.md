# Copy pass

Run once before the PR to `dev`: `/timebox` step 12b in serial mode, the start of step 13 in
lane mode (its commit is covered by step 13's single review of the lead's commits; no
separate review). It covers every user-facing string the feature adds or changes: page text,
labels, buttons, empty states, errors, emails, the README's product section. If the
`humaniser` skill is available in the session, run it on those strings instead; this
checklist, distilled from its AI-tell detection with no voice profile, is the fallback. List
the strings (`git diff origin/dev -- src/`), then fill the table in the epic's review file
(`docs/reviews/<slug>.md`). FOUND quotes the exact text; rewrite it and run the table again
until every row is CLEAN.

| # | Tell | Example to strip |
| --- | --- | --- |
| C1 | Puffery and significance words | pivotal, testament, underscores, seamless, game-changing |
| C2 | AI vocabulary | delve, leverage, utilise, robust, streamline, comprehensive, empower, unlock |
| C3 | Negative parallelism | "not just X, but Y"; "not a X, it's a Y" |
| C4 | Rule of three by reflex | every list exactly three items long |
| C5 | Copulative avoidance | "serves as", "stands as", "boasts" where "is" will do |
| C6 | Collaborative filler | "feel free to", "we hope this helps", "let us know if" |
| C7 | Elegant variation | one thing called by two names; the same thing gets the same word everywhere |
| C8 | Vague promise | "helps you achieve more"; say what it does, with a number if there is one |
| C9 | Error with no next step | an error says what happened and what to do now |
| C10 | Dramatic punctuation | exclamation marks, typographic dashes as clause breaks |
| C11 | Sample data that reads as real | seed text is marked as sample; no real-looking names or quotes |
| C12 | Banned words from a brand guide | only if the brief carries one (design pass, 3.7) |

Record: `COPY_PASS: <n> strings read, C1-C12 CLEAN` once the last run is clean.
