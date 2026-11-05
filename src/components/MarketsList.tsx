"use client";

import { useState } from "react";
import type { MarketEvent } from "@/lib/polymarket";
import { callApi, formatPrice, formatVolume } from "@/lib/client";

export function MarketsList() {
  const [events, setEvents] = useState<MarketEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, "adding" | "done" | string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setEvents((await callApi<{ events: MarketEvent[] }>("/api/markets")).events);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not load events");
    } finally {
      setLoading(false);
    }
  }

  async function add(event: MarketEvent) {
    setAdded((state) => ({ ...state, [event.id]: "adding" }));
    try {
      await callApi("/api/watchlist", { method: "POST", body: JSON.stringify(event) });
      setAdded((state) => ({ ...state, [event.id]: "done" }));
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "Could not add";
      setAdded((state) => ({ ...state, [event.id]: message }));
    }
  }

  return (
    <section className="mt-6">
      <button onClick={load} disabled={loading} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
        {loading ? "Loading..." : events ? "Refresh" : "Load top 10"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <ul className="mt-6 flex flex-col gap-4">
        {events?.map((event) => (
          <li key={event.id} className="rounded border border-slate-200 p-4" data-testid="market-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <a href={`https://polymarket.com/event/${event.slug}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                  {event.title}
                </a>
                <p className="text-xs text-slate-500">
                  Volume {formatVolume(event.volume)}{event.endDate ? ` - ends ${event.endDate.slice(0, 10)}` : ""}
                </p>
              </div>
              <button
                onClick={() => add(event)}
                disabled={added[event.id] === "adding" || added[event.id] === "done"}
                className="shrink-0 rounded border border-slate-900 px-3 py-1 text-sm disabled:opacity-60"
              >
                {added[event.id] === "done" ? "On watchlist" : added[event.id] === "adding" ? "Adding..." : "Add to watchlist"}
              </button>
            </div>
            <ul className="mt-2 text-sm">
              {event.options.map((option) => (
                <li key={option.label} className="flex justify-between border-t border-slate-100 py-1">
                  <span>{option.label}</span>
                  <span className="tabular-nums">{formatPrice(option.yesPrice)}</span>
                </li>
              ))}
            </ul>
            {added[event.id] && !["adding", "done"].includes(added[event.id] ?? "") && (
              <p className="mt-2 text-sm text-red-700">{added[event.id]}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
