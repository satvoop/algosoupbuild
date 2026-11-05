/**
 * A news source adapter. Currents is the only one wired in the PoC; a paid source
 * (or any other data feed) is added by implementing this interface and registering
 * it in `sources.ts`, plus extending the `provider` check in a migration.
 */
export interface NewsArticle {
  url: string;
  title: string;
  source: string | null;
  publishedAt: string | null;
  snippet: string | null;
}

export interface NewsSource {
  provider: "currents";
  search(keywords: string): Promise<NewsArticle[]>;
}
