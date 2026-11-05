"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { callApi } from "@/lib/client";

interface Item { id: string; title: string; added_at: string }

export function WatchlistView() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await callApi<{ items: Item[] }>("/api/watchlist")).items);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not load the watchlist");
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function remove(item: Item) {
    if (!window.confirm(`Remove "${item.title}"? Its news and runs are kept.`)) return;
    try {
      await callApi(`/api/watchlist/${item.id}`, { method: "DELETE" });
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not remove");
    }
  }

  if (error) return <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>;
  if (!items) return <p className="mt-4 text-sm text-slate-500">Loading...</p>;
  if (items.length === 0) return <p className="mt-4 text-sm text-slate-600">No events on your watchlist yet. Add some from <Link href="/" className="underline">Markets</Link>.</p>;
  return (
    <ul className="mt-6 flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between rounded border border-slate-200 p-4">
          <div>
            <Link href={`/watchlist/${item.id}`} className="font-medium hover:underline">{item.title}</Link>
            <p className="text-xs text-slate-500">Added {item.added_at.slice(0, 10)}</p>
          </div>
          <button onClick={() => remove(item)} className="text-sm text-slate-600 hover:underline">Remove</button>
        </li>
      ))}
    </ul>
  );
}
