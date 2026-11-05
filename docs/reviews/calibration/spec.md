# Spec: watchlist add (calibration fixture)

A signed-in user keeps a list of the stock tickers they follow. This spec exists to
calibrate the reviewers: it is never built in a product.

Scope per pair:

* `data-model/` is reviewed against the Data section and AC7.
* `stage5/` is reviewed against AC1-AC6 only, on a base where `data-model/change-2.patch`
  is already merged: the table, its UNIQUE and its policies exist and were approved. The
  route pair does not re-review the data model.

## Data

* One table, `watchlist_items`: an owner (the auth user), a ticker, the time it was added.
* A ticker is 1 to 5 capital letters. A user follows a ticker once.
* A user reads, adds and removes only their own rows. Anonymous visitors read nothing.
* Rows live as long as the account and go when it is deleted.

## Route: POST /api/watchlist, body `{ "ticker": string }`

| AC | Criterion |
| --- | --- |
| AC1 | Signed in, valid ticker: 201 `{ "ticker": "<TICKER>" }`; the ticker is trimmed and upper-cased first. |
| AC2 | The ticker must match `^[A-Z]{1,5}$` after trimming and upper-casing; otherwise, or for a malformed body, 400 `{ "error": "invalid_ticker" }` and nothing is stored. |
| AC3 | Signed out: 401 `{ "error": "unauthenticated" }` and nothing is stored. |
| AC4 | A ticker already on the list: 409 `{ "error": "duplicate" }`. |
| AC5 | Any other storage error: 500 `{ "error": "insert_failed" }`, never a success. |
| AC6 | Every response above has a test. |
| AC7 | Every policy has an allow test, which fails if the policy is removed, and a deny test, which fails if the policy is loosened (to `true` or to any signed-in user) and proves no row was added or removed. An operation with no policy has a test that it changes nothing. |
