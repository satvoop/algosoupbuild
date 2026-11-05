-- Analyst core: watchlist, news, strategies, runs (docs/architecture/data-model.md).
-- Access model: server-only. RLS is on (secure defaults); no policies; all table
-- privileges revoked from anon and authenticated so only the secret-key server
-- client reaches these tables, behind the password cookie.
-- APPLIED ONCE: not idempotent (bare create table, seed insert). Never re-run;
-- any change after it is applied ships as a new migration.

create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  polymarket_event_id text not null unique check (length(polymarket_event_id) between 1 and 64),
  slug text not null check (length(slug) between 1 and 300),
  title text not null check (length(title) between 1 and 500),
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  volume numeric,
  end_date timestamptz,
  added_at timestamptz not null default now(),
  removed_at timestamptz
);

create table public.news_fetches (
  id uuid primary key default gen_random_uuid(),
  watchlist_item_id uuid not null references public.watchlist_items (id) on delete restrict,
  provider text not null check (provider in ('currents')),
  queries jsonb not null check (jsonb_typeof(queries) = 'array'),
  model text,
  status text not null check (status in ('ok', 'error')),
  error text,
  candidate_count integer not null default 0 check (candidate_count >= 0),
  kept_count integer not null default 0 check (kept_count >= 0),
  filter_applied boolean not null default false,
  fetched_at timestamptz not null default now(),
  check (status = 'ok' or error is not null)
);
create index news_fetches_item_idx on public.news_fetches (watchlist_item_id, fetched_at desc);

create table public.news_articles (
  id uuid primary key default gen_random_uuid(),
  news_fetch_id uuid not null references public.news_fetches (id) on delete restrict,
  url text not null check (url ~ '^https?://'),
  title text not null,
  source text,
  published_at timestamptz,
  snippet text,
  relevance numeric check (relevance is null or (relevance >= 0 and relevance <= 1)),
  created_at timestamptz not null default now()
);
create index news_articles_fetch_idx on public.news_articles (news_fetch_id);

create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  description text,
  prompt_template text not null check (length(prompt_template) between 1 and 8000),
  output_type text not null check (output_type in ('text', 'json')),
  output_schema jsonb,
  is_seed boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (output_type = 'text' or jsonb_typeof(output_schema) = 'object')
);

-- Names are unique among active strategies only, so an archived name can be reused.
create unique index strategies_active_name_idx on public.strategies (lower(name)) where archived_at is null;

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies (id) on delete restrict,
  watchlist_item_id uuid not null references public.watchlist_items (id) on delete restrict,
  strategy_name text not null,
  prompt_rendered text not null,
  inputs_snapshot jsonb not null,
  output_text text,
  output_json jsonb,
  model text not null,
  status text not null check (status in ('ok', 'error')),
  error text,
  created_at timestamptz not null default now(),
  check (status = 'error' or output_text is not null or output_json is not null),
  check (status = 'ok' or error is not null)
);
create index analysis_runs_item_idx on public.analysis_runs (watchlist_item_id, created_at desc);
create index analysis_runs_strategy_idx on public.analysis_runs (strategy_id);

-- Server-only: no client role may touch these tables (reason: shared-password app,
-- every read and write goes through server routes after the cookie check).
revoke all on public.watchlist_items, public.news_fetches, public.news_articles,
  public.strategies, public.analysis_runs from anon, authenticated;

-- The LLM call logs are append-only, even for the server role (data-model.md section 4).
revoke update, delete on public.news_fetches, public.analysis_runs from service_role;

-- Seeded strategy menu (design pass P3, Sat's three seeds). Product data, not demo data.
insert into public.strategies (name, description, prompt_template, output_type, output_schema, is_seed) values
(
  'News summary',
  'Plain summary of the current news on this market.',
  'You are an analyst for a prediction-market trader.
Market: {{event_title}}
Options and current Yes prices: {{options}}
Relevant news ({{article_count}} articles):
{{articles}}

Write a concise summary (max 200 words) of what the current news says about this market. Name which options the news concerns. If there are no articles, say so plainly and do not invent news.',
  'text', null, true
),
(
  'Option mention count',
  'Counts articles mentioning each option and interprets what the count signals.',
  'You are an analyst for a prediction-market trader.
Market: {{event_title}}
Options and current Yes prices: {{options}}
Relevant news ({{article_count}} articles):
{{articles}}

For each option, count how many of the articles above mention it (by name or clear reference). Then interpret the signal: a high count relative to the other options suggests news attention, which may indicate momentum or may already be priced in; compare each count with the option''s current price and say which options look over- or under-covered relative to their price. Do not invent articles.',
  'json',
  '{"type":"object","required":["counts","signal"],"properties":{"counts":{"type":"array","description":"[{option, mentions, price}]"},"signal":{"type":"string","description":"what the counts suggest vs the prices"}}}'::jsonb,
  true
),
(
  'Bull/bear case',
  'For and against the leading options, citing the articles used.',
  'You are an analyst for a prediction-market trader.
Market: {{event_title}}
Options and current Yes prices: {{options}}
Relevant news ({{article_count}} articles):
{{articles}}

For the top 3 options by price, give the bull case (why it resolves Yes) and the bear case (why not), each in at most two sentences, citing article numbers. Say where the news is thin. Do not invent articles.',
  'json',
  '{"type":"object","required":["cases"],"properties":{"cases":{"type":"array","description":"[{option, price, bull, bear, cited_articles}]"},"news_coverage":{"type":"string"}}}'::jsonb,
  true
);
