"use client";

import { useCallback, useEffect, useState } from "react";
import { callApi, formatPrice } from "@/lib/client";
import type { MarketOption } from "@/lib/polymarket";
import { RunCard, type Run } from "@/components/RunCard";
import { NewsPanel, type News } from "@/components/NewsPanel";

interface Detail { item: { id: string; title: string; slug: string; options: MarketOption[]; added_at: string }; news: News; runs: Run[] }
interface Strategy { id: string; name: string; output_type: string; is_seed: boolean }

export function ItemView({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState<"news" | "run" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [loaded, list] = await Promise.all([
        callApi<Detail>(`/api/watchlist/${id}`),
        callApi<{ strategies: Strategy[] }>("/api/strategies"),
      ]);
      setDetail(loaded);
      setStrategies(list.strategies);
      setSelected((current) => current || list.strategies[0]?.id || "");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not load");
    }
  }, [id]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function act(kind: "news" | "run") {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "news") await callApi(`/api/watchlist/${id}/news`, { method: "POST" });
      else await callApi(`/api/watchlist/${id}/runs`, { method: "POST", body: JSON.stringify({ strategyId: selected }) });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed");
    } finally {
      await load();
      setBusy(null);
    }
  }

  if (!detail) return error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="text-sm text-slate-500">Loading...</p>;
  const { item, news, runs } = detail;
  return (
    <div>
      <h1 className="text-2xl font-semibold">{item.title}</h1>
      <p className="text-xs text-slate-500">Odds snapshot from {item.added_at.slice(0, 10)} - <a className="underline" href={`https://polymarket.com/event/${item.slug}`} target="_blank" rel="noreferrer">Polymarket</a></p>
      <ul className="mt-3 text-sm">
        {item.options.map((option) => <li key={option.label} className="flex justify-between border-t border-slate-100 py-1"><span>{option.label}</span><span>{formatPrice(option.yesPrice)}</span></li>)}
      </ul>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <NewsPanel news={news} busy={busy === "news"} disabled={busy !== null} onRefresh={() => act("news")} />
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Run a strategy</h2>
        <div className="mt-2 flex gap-2">
          <select aria-label="Strategy" value={selected} onChange={(event) => setSelected(event.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm">
            {strategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.name} ({strategy.output_type})</option>)}
          </select>
          <button onClick={() => act("run")} disabled={busy !== null || !selected} className="rounded bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-50">
            {busy === "run" ? "Running..." : "Run"}
          </button>
        </div>
        <h3 className="mt-6 text-sm font-semibold text-slate-700">Run history ({runs.length})</h3>
        <ul className="mt-2 flex flex-col gap-3">{runs.map((run) => <RunCard key={run.id} run={run} />)}</ul>
      </section>
    </div>
  );
}
