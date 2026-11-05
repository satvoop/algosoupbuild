import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PipelineResult } from "@/lib/news/pipeline";

export interface StoredArticle {
  id: string;
  url: string;
  title: string;
  source: string | null;
  published_at: string | null;
  snippet: string | null;
  relevance: number | null;
}

export interface StoredFetch {
  id: string;
  status: "ok" | "error";
  error: string | null;
  queries: string[];
  candidate_count: number;
  kept_count: number;
  filter_applied: boolean;
  fetched_at: string;
}

function fail(action: string, message: string): never {
  throw new Error(`Database error while ${action}: ${message}`);
}

export async function recordFetchError(itemId: string, queries: string[], error: string, model: string): Promise<void> {
  const { error: dbError } = await createSupabaseAdminClient().from("news_fetches").insert({
    watchlist_item_id: itemId, provider: "currents", queries, model, status: "error", error,
  });
  if (dbError) fail("recording a failed news fetch", dbError.message);
}

export async function recordFetch(itemId: string, result: PipelineResult, model: string): Promise<string> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.from("news_fetches").insert({
    watchlist_item_id: itemId, provider: "currents", queries: result.queries, model, status: "ok",
    candidate_count: result.candidateCount, kept_count: result.kept.length, filter_applied: result.filterApplied,
  }).select("id").single();
  if (error) fail("recording a news fetch", error.message);
  const fetchId = (data as { id: string }).id;
  if (result.kept.length > 0) {
    const rows = result.kept.map((article) => ({
      news_fetch_id: fetchId, url: article.url,
      title: article.title, source: article.source, published_at: article.publishedAt,
      snippet: article.snippet, relevance: article.relevance,
    }));
    const { error: articleError } = await client.from("news_articles").insert(rows);
    if (articleError) fail("storing news articles", articleError.message);
  }
  return fetchId;
}

/** The latest fetch for an item and, if it succeeded, its kept articles. */
export async function latestNews(itemId: string): Promise<{ fetch: StoredFetch | null; articles: StoredArticle[] }> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.from("news_fetches").select("*").eq("watchlist_item_id", itemId)
    .order("fetched_at", { ascending: false }).limit(1).maybeSingle();
  if (error) fail("reading news fetches", error.message);
  const latest = (data as StoredFetch | null) ?? null;
  if (!latest || latest.status !== "ok") return { fetch: latest, articles: [] };
  const { data: articles, error: articleError } = await client.from("news_articles").select("*")
    .eq("news_fetch_id", latest.id).order("relevance", { ascending: false, nullsFirst: false });
  if (articleError) fail("reading news articles", articleError.message);
  return { fetch: latest, articles: (articles ?? []) as StoredArticle[] };
}
