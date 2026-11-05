import type { NewsArticle, NewsSource } from "@/lib/news/types";
import { cleanQuery, keywordPrompt, relevancePrompt } from "@/lib/news/prompts";
import { extractJson } from "@/lib/llm";

export const RELEVANCE_THRESHOLD = 0.5;

export interface ScoredArticle extends NewsArticle {
  relevance: number | null;
}

export interface PipelineResult {
  queries: string[];
  candidateCount: number;
  filterApplied: boolean;
  kept: ScoredArticle[];
}

type Ask = (prompt: string, maxTokens: number) => Promise<string>;

export async function buildQueries(ask: Ask, title: string, options: string[]): Promise<string[]> {
  const parsed = extractJson(await ask(keywordPrompt(title, options), 300)) as { queries?: unknown } | null;
  const generated = Array.isArray(parsed?.queries) ? parsed.queries.filter((q): q is string => typeof q === "string") : [];
  const queries = [title, ...generated.slice(0, 2).map(cleanQuery)].filter((query) => query.length > 0);
  return [...new Set(queries)];
}

export function dedupe(articles: NewsArticle[]): NewsArticle[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  return articles.filter((article) => {
    const titleKey = article.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seenUrls.has(article.url) || seenTitles.has(titleKey)) return false;
    seenUrls.add(article.url);
    seenTitles.add(titleKey);
    return true;
  });
}

/** Scores by index; returns null when the reply is unusable so the caller keeps the unfiltered list. */
export function applyScores(articles: NewsArticle[], reply: unknown): ScoredArticle[] | null {
  if (!Array.isArray(reply)) return null;
  const scores = new Map<number, number>();
  for (const entry of reply as { i?: unknown; s?: unknown }[]) {
    if (typeof entry?.i === "number" && typeof entry.s === "number") scores.set(entry.i, Math.min(1, Math.max(0, entry.s)));
  }
  if (scores.size === 0) return null;
  return articles
    .map((article, index) => ({ ...article, relevance: scores.get(index) ?? null }))
    .filter((article) => (article.relevance ?? 0) >= RELEVANCE_THRESHOLD)
    .sort((left, right) => (right.relevance ?? 0) - (left.relevance ?? 0));
}

export async function runNewsPipeline(
  source: NewsSource,
  ask: Ask,
  title: string,
  options: string[],
): Promise<PipelineResult> {
  const queries = await buildQueries(ask, title, options);
  const batches = await Promise.all(queries.map((query) => source.search(query)));
  const candidates = dedupe(batches.flat()).slice(0, 40);
  if (candidates.length === 0) return { queries, candidateCount: 0, filterApplied: false, kept: [] };
  const scored = applyScores(candidates, extractJson(await ask(relevancePrompt(title, options, candidates), 4000)));
  if (scored === null) {
    return { queries, candidateCount: candidates.length, filterApplied: false, kept: candidates.map((a) => ({ ...a, relevance: null })) };
  }
  return { queries, candidateCount: candidates.length, filterApplied: true, kept: scored };
}
