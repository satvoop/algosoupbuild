# Design pass: Algosoup market analyst (PoC)

Skill: `product-design` v2.6.0 (Timebox depth)

Tags: `[brief]` (operator's brief), `[assumption]`, `[decision]` (Sat decided in session; quoted where he wrote his own words).

* Brief: pasted in the session at minute 0 (2026-11-05T00:16:04Z).
* Drafted: 2026-11-05T00:30Z. Design gate approved: <pending>

## 1. Frame (Phase 0, steps 1-8)

| Step | Item | Line |
| --- | --- | --- |
| 0.1 | The question | Can a trader go from Polymarket's top markets to a saved, re-runnable analysis strategy over fresh news in one sitting, with every run stored? `[decision]` "Strategy loop PoC" |
| 0.2 | Appetite | One hour from minute 0 (2026-11-05T00:16:04Z). Scope fits the hour. |
| 0.3 | Decider | The owner (Sat). |
| 0.4 | Modules | ai-native: an LLM generates news queries, filters relevance and runs every strategy. Others not selected (no money, no game, no share unit). |
| 0.4 | Data depth line | No personal data (shared password, no accounts, no user-authored data about people). No money. AI in production as single prompt-and-response calls only (no multi-step agent with memory): each run is logged as one row with its rendered prompt; the AI vendor (Anthropic) receives event titles, news snippets and strategy prompts, none personal. One tenant (one shared workspace). |
| 0.5 | Four risks | Table below. |
| 0.6 | Hard constraints | Free news API only `[brief]`; password, not a login `[brief]`; top 10 loaded on a button click, not stored `[brief]`; watchlist, strategies and results stored `[brief]`; template stack (Next.js, Supabase, Vercel). |
| 3.7 | Brand constraints | No brand guide in the brief: 3.7 skipped. |
| 0.7 | What is not researched | No users reachable in the hour: no interviews, observation or synthesis (1.1, 1.2, 1.8). Signal quality of free news for trading is not tested. |
| 0.8 | Inputs on hand | Sat's brief (asserts the workflow, not demand); Polymarket Gamma API research (live curls: `/events?order=volume&closed=false` gives a readable top 10; `/markets?order=volumeNum` gives ten near-duplicate 2028 long-shot legs); news API research (NewsAPI/GNews ruled out by terms and 12-24h delay; GDELT 429 from this host; Currents free tier allows commercial use with attribution, 250 req/day, freshness unverified); a parallel news-prompt experiment (in flight at drafting). |

Four risks, first read:

| Risk | Known | Assumed | What would kill it |
| --- | --- | --- | --- |
| Value | Sat wants a repeatable method, not one-off answers `[decision]` | Stored, re-runnable strategies are what a quant builder values first | Traders keep using ad-hoc chat because runs are not comparable |
| Usability (the kill risk, designed around) `[decision]` | A blank prompt box gets no useful use | A seeded menu of strategies unblocks the first run | The trader faces an empty prompt and does nothing; response: three seeded strategies, the menu is the first thing on the watchlist item |
| Feasibility | Gamma API needs no auth, 5-minute upstream cache; Currents key on hand | LLM latency stays under ~20s per run; Currents returns current articles | Currents returns stale or no articles for political/sports events |
| Viability | PoC, free tier, attribution required by Currents | Polymarket ToS allows displaying API data in a private tool | Polymarket ToS "distribute" clause read against commercial use (legal read before anything commercial) |

The five challenges:

| Challenge | Line |
| --- | --- |
| Market fit | Prediction-market volume is large (top event above $1B); demand for analysis tooling is asserted, not shown. |
| Differentiation | Stored strategies with input snapshots make analysis repeatable and comparable; a chat tool does not. |
| Scalability | Source adapters and strategy rows scale to paid sources and more strategies without schema change. |
| User value | The same method runs on the same market over time, and on other markets, in one click. |
| Timing | LLMs make prompt-as-strategy cheap now; prediction markets are mainstream in 2026. |
| Why they would pay | A quant builder pays for paid data plugged in and for the odds-vs-model matcher, the next step. |
| What kills it | Free news is too thin to analyse, so every strategy output reads the same. |

Project challenges:

* A real workflow with state, or a wrapper around a model call? A workflow with state: watchlist, fetched news per market, a strategy library and a run history; the model call is one step.
* Day one: the trader runs the same saved analysis on any watched market and finds every past result stored with the news it used.

## 2. Jobs to be done (1.3)

| Layer | Job | Source |
| --- | --- | --- |
| Functional | Run the same analysis for the same markets over time, and for other markets | `[decision]` "Its a repeatable process, the ability to run the same analysis for the same markets over time and also for other markets" |
| Emotional | Feel the method is disciplined, not improvised | `[assumption]` |
| Social | Be seen by a desk or partners as having a testable process | `[assumption]` |

Job statement: When I research prediction markets, I want to run the same stored analysis method on the same markets over time and on new ones, so I can build a disciplined, testable strategy instead of ad-hoc reading.

## 3. Assumptions (1.7)

| # | Assumption | Type | Important? | Evidence in hand | RISKIEST: accepted bet, and what would show it false |
| --- | --- | --- | --- | --- | --- |
| A1 | Currents returns current articles relevant to Polymarket events | feasibility | yes | none (freshness unverified; experiment in flight) | RISKIEST. Bet. False if more than half of watched events show zero relevant articles after refresh. |
| A2 | A seeded strategy menu beats a blank prompt box | desirability | yes | `[decision]` kill risk named | RISKIEST. Bet. False if users never create their own strategy and never re-run a seeded one. |
| A3 | Stored prompt + inputs snapshot is enough to call a run "repeatable" (LLM output varies) | desirability | yes | none | RISKIEST. Bet. False if two runs on identical inputs disagree so much that comparison is meaningless; temperature 0 set to narrow it. |
| A4 | Events are the right unit for a trader's top 10 | desirability | no | `[decision]` Events; live curl | - |
| A5 | A shared password is enough protection for a PoC | viability | no | `[brief]` | - |

## 4. Problem statement (2.1)

> **A quant builder** needs a way to **apply the same stored analysis method to the same markets over time and to new markets** because **a strategy is only testable if it is repeatable**. Currently, **analysis is ad-hoc prompting and reading**, which causes **results that cannot be compared or re-run**.

`[decision]` "Repeatable method is what matters here - the news data is not numerical and for this PoC it will include simply creating a summary as an analytical method. This will mean that it is not quantifiable - other strategies can then be added for example, a strategy that simply counts the number of times each option is mentioned in the articles relating to the market."

* [x] Describes a need, not a solution.
* [x] Specific enough to design against.
* [x] Supported by all three job layers.
* [x] The user would recognise it as theirs (Sat's words).

## 5. Persona (2.2)

* Name and role: "Ari" (fictional), a quant builder `[decision]`.
* Their day: Ari scans Polymarket's biggest events each morning and picks the few worth tracking. Ari wants each one analysed by the same named methods every time, so later the outputs can feed an odds-vs-model algorithm.
* Frustrations, ranked:
  1. Analysis that cannot be re-run the same way -- `[decision]` "the importance of being able to have processes and prompts stored is the key"
  2. Prose-only outputs where structure is needed -- `[decision]` "structured outputs"
  3. Thin free data -- `[decision]` "higher quality data sources ... can also be used"
* Would NOT want:
  * Auto-trading or order placement.
  * Unsourced conclusions with no record of the articles used.

## 6. Principles (2.3)

`[decision]` "Repeatable > clever".

| # | Principle | Rules out | Trades against |
| --- | --- | --- | --- |
| P1 | Every run is reproducible: stored prompt, stored inputs snapshot, stored output | Ad-hoc chat; results that are not saved | P3 (freedom to write anything vs a stored, named method) |
| P2 | Evidence is visible: every result shows the articles and odds it used | Unsourced output | Minimal UI (more on screen) |
| P3 | Start from a menu, not a blank box: seeded strategies first | An empty prompt box as the entry | P1's openness: the menu nudges towards seeded methods |

## 7. Hypothesis (2.4)

> We believe **a repeatable analysis process** will be achieved if **quant builders** successfully **re-run a stored strategy on a watched market** with **the strategy menu**. We will know this is true when we see **at least one strategy with runs on two or more dates, or on two or more markets**.

How the signal is read: `select strategy_id, count(distinct watchlist_item_id), count(distinct created_at::date) from analysis_runs group by strategy_id`.

## 8. Appetite check and cut list (2.8)

* In the hour: password in, load top 10 events, add to watchlist, refresh news per item, pick or write a strategy, run it, see the stored result with its evidence.

`[decision]` "Standard cuts".

| Cut | Why | Backlog card |
| --- | --- | --- |
| Multi-step (multi-pronged) strategies | Roughly doubles the build | <card> |
| Odds-vs-probability matching algorithm | `[brief]` "not enough time" | <card> |
| Extra data sources (adapter interface built, Currents only wired) | One source fits the hour | <card> |
| Scheduled re-runs | No background jobs in the template | <card> |
| Strategy versioning / edit history | Edit overwrites; runs keep the rendered prompt | <card> |
| Per-user accounts | `[brief]` a password, not a login | <card> |
| Run comparison view | History list only | <card> |

## 9. Concept (3.2)

| Element | Description |
| --- | --- |
| Name | Strategy menu |
| One-liner | A library of stored analysis strategies you run on any watched Polymarket event, with every result kept beside the news and odds it used. |
| How it works | The trader enters the shared password, clicks "Load top 10" and sees the ten highest-volume open Polymarket events with their options and Yes prices. "Add to watchlist" stores the event with an odds snapshot. On the watchlist, each item has "Refresh news": the server asks the LLM for search queries, fetches Currents, has the LLM score relevance and stores the kept articles with their reason. A strategy is a name, a prompt template and an output type `[decision]` "Prompt + output schema": text, or JSON against a stored schema. Three are seeded: "News summary" (text), "Option mention count" (JSON: count of articles mentioning each option, Sat's example) and "Bull/bear case" (JSON: for and against per top option). Running a strategy renders the prompt with the event, options, odds and stored articles, calls the LLM at temperature 0, and stores the run: rendered prompt, inputs snapshot, output, model, status. |
| Key interaction | On a watchlist item: pick a strategy from the menu, click Run, read the result with its evidence. |
| Why it might work | Functional job (repeatable method) and P1/P3. |
| Why it might fail | A1 (thin news) makes every output vacuous; A3 (LLM variance) undermines "repeatable". |
| Kano category | Performance |
| Share unit | N/A |

## 10. Core flow (3.4)

```
[Password] -> wrong -> [Error, retry]
     \-> [Home: empty, "Load top 10"] -> click -> [Top 10 events + options]
              \-> Polymarket error -> [Error message + retry]
         -> "Add to watchlist" -> [Added (button shows "On watchlist")]
         -> [Watchlist] -> empty -> ["No markets yet, add from Home"]
         -> [Item] -> "Refresh news" -> [Articles with source, date, relevance reason]
                         \-> zero relevant -> ["No relevant news found", retry]
                         \-> news API error / rate limit -> [Error, retry later]
         -> pick strategy from menu (or "New strategy") -> "Run"
                         -> [Result stored, shown with articles + odds used]
                         \-> LLM error / bad JSON -> [Run stored as failed with the error; retry]
         -> [Strategies] -> create / edit / delete a strategy
```

Returning-visitor leg (cookie valid 7 days; expired cookie goes to the password screen first):

```
[Return / reload] -> [Watchlist] -> [items, stored news, strategy menu and every past run persist]
[Return / reload] -> [Home] -> [empty until "Load top 10" is clicked again (not stored, by brief)]
```

## 11. Breadboard (3.9)

```
[Password]
  submit -> [Home]
[Home]
  "Load top 10" -> [Home with list]
  "Add to watchlist" -> [Home with list] (item marked)
  nav "Watchlist" -> [Watchlist]; nav "Strategies" -> [Strategies]
[Watchlist]
  item -> [Watchlist item]
  "Remove" -> [Watchlist]
[Watchlist item]
  "Refresh news" -> [Watchlist item]
  strategy select + "Run" -> [Watchlist item] (new run on top of history)
[Strategies]
  "New strategy" / "Edit" -> [Strategy form] -> save -> [Strategies]
  "Delete" -> [Strategies]
```

| Screen | Purpose | Key elements | Primary action | Data shown | Entry | Exit |
| --- | --- | --- | --- | --- | --- | --- |
| Password | Keep the tool private | password field, error line | Enter | none | any URL without a valid cookie | Home |
| Home | Pick markets | Load button, 10 event cards (title, volume, end date, top options with Yes price, Polymarket link) | Add to watchlist | live Gamma events (not stored) | nav | Watchlist |
| Watchlist | See what is tracked | list of items (title, added date, news count, run count) | Open item | watchlist_items | nav | item |
| Watchlist item | Analyse one market | odds snapshot, Refresh news, articles (title, source, date, reason), strategy menu, Run, run history | Run strategy | watchlist_items, news_articles, strategies, analysis_runs | Watchlist | Watchlist |
| Strategies | Manage the menu | list (name, output type, seeded tag), form (name, description, prompt template with placeholders, output type, JSON schema) | Save | strategies | nav | Strategies |

## 12. Data model (3.11)

| Entity | Traced to | Owner of the fact | Personal data? |
| --- | --- | --- | --- |
| watchlist_item (Polymarket event id, slug, title, options + odds snapshot at add) | Home "Add", Watchlist | Polymarket (copied), the workspace (the choice) | no |
| news_article (item, provider, url, title, source, published, snippet, relevance score + reason, fetched at) | Watchlist item "Refresh news" | the news provider (copied); the LLM (score) | no |
| strategy (name, description, prompt template, output type, output schema, seeded flag) | Strategies | the workspace | no |
| analysis_run (strategy, item, rendered prompt, inputs snapshot, output text/json, model, status, error) | Watchlist item "Run" | the system (LLM output) | no |

Access `[decision]` "Shared password, server-only DB": RLS on, no anon or authenticated grants; only server routes touch the tables with the secret key, behind the password cookie.

## 13. Modules (3.3)

ai-native:
* AI role: query writer and relevance judge for news; executor of strategies.
* Proactive: none (every call is a click; the user controls cost).
* Reactive: Refresh news, Run.
* Confidence: relevance score and one-line reason on each article; JSON strategies carry their own confidence fields where the schema asks.
* Graceful degradation: zero relevant articles says so and the run still works on odds alone, stated in the result; bad JSON stores a failed run with the raw text.
* Tone: plain, analytical; no brand guide.
* When-wrong paths, each a story in section 14: news error, zero relevant news, LLM error, invalid JSON.

## 14. User stories (4.5)

> S1 **As** Ari, **I want to** enter the shared password, **so that** only invited people use the tool. Given no cookie, when I open any page, then I see the password screen; a wrong password shows "Wrong password" and a right one opens Home. Feels like P1.

> S2 **As** Ari, **I want to** load the top 10 events by volume, **so that** I can pick markets. Given Home, when I click "Load top 10", then ten open events show with title, volume, end date and options with Yes prices; on a Polymarket error I see a message and a retry. Feels like P2.

> S3 **As** Ari, **I want to** add an event to my watchlist, **so that** it is stored for analysis. Given the list, when I click "Add to watchlist", then the item is stored with an odds snapshot and the button reads "On watchlist"; adding twice does not duplicate. Feels like P1.

> S4 **As** Ari, **I want to** refresh news for a watched market, **so that** analysis uses current news. Given an item, when I click "Refresh news", then relevant articles show with source, date and relevance reason; zero relevant says "No relevant news found"; a provider error says so with a retry. Feels like P2.

> S5 **As** Ari, **I want to** start from a menu of strategies, **so that** I never face a blank box. Given a fresh workspace, when I open an item, then three seeded strategies are in the menu. Feels like P3.

> S6 **As** Ari, **I want to** create, edit and delete a strategy, **so that** I can build my own methods. Given Strategies, when I save a name, prompt template and output type, then it appears in every item's menu. Feels like P1.

> S7 **As** Ari, **I want to** run a strategy on a watched market, **so that** I get a stored result. Given an item with news, when I pick a strategy and click Run, then the result shows with the articles and odds it used and is stored in the run history; an LLM error or invalid JSON stores a failed run with the reason. Feels like P1, P2.

> S8 (returning) **As** Ari, **I want to** come back later and find my work, **so that** I can re-run the same method. Given a valid cookie, when I reload the watchlist, then items, news, strategies and every past run are there; Home is empty until I load again. Feels like P1.

## 15. Critique (4.2)

* Review file: `docs/design/reviews/2026-11-05-critique.md`
* Verdict line, quoted: <pending>

## 16. Handoff checklist (4.8)

* [x] Every section filled, or N/A with a reason
* [x] Every story traces to a step of the core flow, a principle and the problem statement
* [x] The hypothesis signal is measurable and says how it is read
* [x] Four risks re-read: A1-A3 carried as accepted bets
* [ ] Appetite respected; every cut on the list has a Backlog card (cards created at Gate 1)
* [x] Modules run are named: ai-native
* [x] Data model entities listed; the record and dictionary follow at step 7
* [ ] Critique verdict quoted
* [x] Slice list follows the core flow, schema first

Full-skill 4.8 items not met: HEART targets (2.5 skipped); brand notes (no brand guide); full design spec (product spec stands in); companion skills (not a product-repo check).

## 17. Skipped steps and why

* 1.1 research plan, 1.2 user research, 1.8 synthesis: no users are reachable in an hour.
* 1.4, 1.5, 1.6: not carried in the brief.
* 2.5 HEART: the hypothesis signal stands in.
* 2.6 Kano and opportunity tree, 2.7 riskiest-assumption tests: assumptions stay accepted bets.
* 3.1 How Might We: one concept.
* 3.5, 3.6: the breadboard carries the places and connections.
* 3.7 brand integration: skipped: no brand guide.
* 3.8 visual direction: code is the rung reached.
* 3.10 assumption tests: nothing to run.
* 4.1 decide: one concept.
* 4.3 fidelity ladder: code, walked once by the owner.
* 4.6-4.7: the spec's slices and the template's defaults carry them.
* Modules not selected (monetisation, game-and-league, shareability) do not run.
