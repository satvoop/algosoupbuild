interface Article { id: string; url: string; title: string; source: string | null; published_at: string | null; relevance: number | null }
export interface News {
  fetch: { status: "ok" | "error"; error: string | null; fetched_at: string; queries: string[]; filter_applied: boolean } | null;
  articles: Article[];
}

export function NewsPanel({ news, busy, disabled, onRefresh }: { news: News; busy: boolean; disabled: boolean; onRefresh: () => void }) {
  const { fetch, articles } = news;
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Current news</h2>
        <button onClick={onRefresh} disabled={disabled} className="rounded border border-slate-900 px-3 py-1 text-sm disabled:opacity-50">
          {busy ? "Refreshing..." : "Refresh news"}
        </button>
      </div>
      {!fetch && <p className="mt-2 text-sm text-slate-600">No news fetched yet. Click Refresh news.</p>}
      {fetch?.status === "error" && <p className="mt-2 text-sm text-red-700">Last refresh failed: {fetch.error}. Try again later.{articles.length > 0 ? " Showing the last successful fetch." : ""}</p>}
      {fetch?.status === "ok" && (
        <p className="mt-1 text-xs text-slate-500">
          Fetched {fetch.fetched_at.replace("T", " ").slice(0, 16)} UTC - queries: {fetch.queries.join(" | ")}
          {fetch.filter_applied ? "" : " - relevance filter unavailable, unfiltered"}
        </p>
      )}
      {fetch?.status === "ok" && articles.length === 0 && <p className="mt-2 text-sm text-slate-600">No relevant news found.</p>}
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {articles.map((article) => (
          <li key={article.id} className="border-t border-slate-100 pt-2">
            <a href={article.url} target="_blank" rel="noreferrer" className="hover:underline">{article.title}</a>
            <p className="text-xs text-slate-500">
              {article.source ?? "unknown source"} - {article.published_at?.slice(0, 10) ?? "undated"}
              {article.relevance !== null ? ` - relevance ${article.relevance.toFixed(2)}` : ""}
            </p>
          </li>
        ))}
      </ul>
      {articles.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">News from <a href="https://currentsapi.services" target="_blank" rel="noreferrer" className="underline">Currents API</a>; links go to the original articles.</p>
      )}
    </section>
  );
}
