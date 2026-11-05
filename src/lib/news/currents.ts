import "server-only";
import { SERVER_ENV, requireEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/http";
import type { NewsArticle, NewsSource } from "@/lib/news/types";

interface CurrentsArticle {
  title?: unknown;
  description?: unknown;
  url?: unknown;
  author?: unknown;
  published?: unknown;
}

/** Currents dates look like "2026-11-04 23:39:13 +0000"; convert to ISO or null. */
export function parseCurrentsDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) \+0000$/);
  return match ? `${match[1]}T${match[2]}Z` : null;
}

export function toArticle(raw: CurrentsArticle): NewsArticle | null {
  if (typeof raw.url !== "string" || !/^https?:\/\//.test(raw.url)) return null;
  if (typeof raw.title !== "string" || raw.title.length === 0) return null;
  let source: string | null = null;
  try {
    source = new URL(raw.url).hostname.replace(/^www\./, "");
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
  }
  return {
    url: raw.url,
    title: raw.title,
    source,
    publishedAt: parseCurrentsDate(raw.published),
    snippet: typeof raw.description === "string" ? raw.description.slice(0, 500) : null,
  };
}

export const currentsSource: NewsSource = {
  provider: "currents",
  async search(keywords: string): Promise<NewsArticle[]> {
    const url = `https://api.currentsapi.services/v1/search?language=en&keywords=${encodeURIComponent(keywords)}`;
    const response = await fetchWithTimeout(
      url,
      { headers: { Authorization: requireEnv(SERVER_ENV.currents) }, cache: "no-store" },
      15000,
    );
    if (response.status === 429) throw new Error("Currents rate limit reached; try again later");
    if (!response.ok) throw new Error(`Currents returned HTTP ${response.status}`);
    const body = (await response.json()) as { news?: CurrentsArticle[] };
    return (body.news ?? []).map(toArticle).filter((item): item is NewsArticle => item !== null);
  },
};
