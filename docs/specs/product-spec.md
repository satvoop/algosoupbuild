# Spec: Algosoup market analyst PoC

User, job, scope cut: `docs/design/design-pass.md` (Design gate approved 2026-11-05 ~00:34Z, Sat: "Approved"). Data model: `docs/architecture/data-model.md`.

## Decisions carried from the Design gate

* News method `[decision]` "M3 v2 as tested": title query + 2 LLM queries (Haiku, years stripped), 3 Currents searches, dedupe by URL and normalised title, one Haiku index-keyed relevance call, keep score >= 0.5; on filter JSON failure keep the unfiltered list and record `filter_applied=false`. Score shown, no per-article reason.
* Critic fixes `[decision]` "Cheap set": findings 2, 3, 4, 5, 6, 7, 8 and the S1 loading/help items. Finding 1 deferred to the README.

## Acceptance criteria

| # | Given / when / then |
| --- | --- |
| AC1 | Given no valid cookie, when any page or `/api/*` route (except `/api/health`, `/api/login`) is requested, then pages redirect to `/login` and APIs return 401. |
| AC2 | Given `/login`, when the password matches `APP_PASSWORD`, then an httpOnly, Secure, SameSite=Lax cookie (HMAC-signed, 7 days) is set and Home opens; a wrong password shows "Wrong password" and sets nothing. |
| AC3 | Given Home, when "Load top 10" is clicked, then the 10 highest-volume open Polymarket events show: title, volume, end date, top options by Yes price (max 5), Polymarket link; the button shows "Loading..." and is disabled meanwhile; a Polymarket error shows a message and the button stays usable. Nothing is stored. |
| AC4 | Given the list, when "Add to watchlist" is clicked, then the event is stored with its options snapshot and the button reads "On watchlist"; adding a stored (or removed) event again restores it without a duplicate row. |
| AC5 | Given Watchlist, when it opens, then active items show (title, added date); empty shows "No events on your watchlist yet. Add some from Markets." (amended 2026-11-05 after stage5 review: the nav names Home "Markets"; Sat chose "Quick three") "Remove" soft-removes (runs and news kept). |
| AC6 | Given an item, when "Refresh news" is clicked, then M3 v2 runs, a `news_fetches` row stores the queries, model and counts, kept articles show with source, date, relevance score; "Loading..." and disabled meanwhile; zero kept shows "No relevant news found"; a provider/LLM error is stored as a failed fetch and shown with a retry. A "News from Currents" attribution with a link shows under the articles. |
| AC7 | Given a fresh workspace, when an item opens, then the three seeded strategies are in the menu (P3). |
| AC8 | Given Strategies, when a strategy is saved, then name (1-120 chars), prompt template, output type are required; a JSON strategy requires a schema that parses to a JSON object; an unknown `{{placeholder}}` is rejected with its name; the form lists the placeholders `{{event_title}}`, `{{options}}`, `{{articles}}`, `{{article_count}}`. Edit updates in place; "Archive" (with confirm) hides it from the menu and keeps its runs. |
| AC9 | Given an item, when a strategy is picked and "Run" clicked, then the prompt is rendered with the item, options and the latest kept articles, Claude is called (temperature 0, 30 s timeout), and a run is stored with rendered prompt, inputs snapshot, output and model, then shown on top of the history with the articles and odds used. Run button disabled while running. |
| AC10 | Given an item with no news yet or zero kept articles, when a strategy runs, then it runs on the odds alone and the result is labelled "Run with no news articles". |
| AC11 | Given a JSON strategy, when the model output is not a JSON object with the schema's `required` keys, or the call errors or times out, then a failed run is stored with the reason and the raw text, and shown as failed. |
| AC12 (returning) | Given a valid cookie, when the user reloads Watchlist or an item, then items, news, strategies and all past runs are there; Home is empty until loaded again. |
| AC13 | Every API route has a happy-path and an error-path unit test, using fixtures (no live API calls in tests). |

## Rabbit holes (critic S2 findings and owners)

* F1 hypothesis signal cannot fail inside the hour -- owner Sat; README states it needs real users over days.
* F2 deletes wiping history -- fixed (soft remove, archive, RESTRICT FKs, run copies name + prompt).
* F3-F8 -- fixed by AC8, AC10, AC6, AC9/AC11 as above. Owner: lead.
* Polymarket ToS "distribute" clause -- owner Sat; legal read before commercial use.

## Slices (serial, schema first)

0. Group 0: schema (done, 42d6d75).
1. Skeleton: password gate (proxy + login route), Home with Load top 10 (Polymarket adapter), health unchanged. Deploy.
2. Watchlist: add/remove/list API + pages.
3. News: Currents adapter behind a `NewsSource` interface, M3 v2 pipeline, refresh API, item page.
4. Strategies + runs: CRUD API, Strategies page, run API, run history.
5. README.

## Out of scope

The design pass cut list (section 8), each a Backlog card.
