import { JsonResult } from "@/components/JsonResult";

interface Run {
  id: string; strategy_name: string; status: "ok" | "error"; error: string | null; created_at: string;
  output_text: string | null; output_json: unknown; inputs_snapshot: { no_news?: boolean; articles?: { title: string; url: string }[] };
}

export type { Run };

export function RunCard({ run }: { run: Run }) {
  const articles = run.inputs_snapshot.articles ?? [];
  return (
    <li className="rounded border border-slate-200 p-4" data-testid="run-card">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{run.strategy_name}</span>
        <span className="text-slate-500">{run.created_at.replace("T", " ").slice(0, 16)} UTC</span>
      </div>
      {run.inputs_snapshot.no_news && <p className="mt-1 text-xs text-amber-700">Run with no news articles</p>}
      {run.status === "error" && <p className="mt-2 text-sm text-red-700">Run failed: {run.error}</p>}
      {run.output_json !== null && run.output_json !== undefined && (
        <JsonResult data={run.output_json} />
      )}
      {run.output_text && <p className="mt-2 whitespace-pre-wrap text-sm">{run.output_text}</p>}
      {articles.length > 0 && (
        <details className="mt-2 text-xs text-slate-600">
          <summary>Evidence: {articles.length} articles used</summary>
          <ol className="mt-1 list-decimal pl-5">
            {articles.map((article) => <li key={article.url}><a href={article.url} target="_blank" rel="noreferrer" className="underline">{article.title}</a></li>)}
          </ol>
        </details>
      )}
    </li>
  );
}
