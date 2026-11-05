import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MarketEvent, MarketOption } from "@/lib/polymarket";

export interface WatchlistItem {
  id: string;
  polymarket_event_id: string;
  slug: string;
  title: string;
  options: MarketOption[];
  volume: number | null;
  end_date: string | null;
  added_at: string;
  removed_at: string | null;
}

function fail(action: string, message: string): never {
  throw new Error(`Database error while ${action}: ${message}`);
}

export async function listWatchlist(): Promise<WatchlistItem[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("watchlist_items")
    .select("*")
    .is("removed_at", null)
    .order("added_at", { ascending: false });
  if (error) fail("listing the watchlist", error.message);
  return (data ?? []) as WatchlistItem[];
}

/** Add or restore: one row per Polymarket event (UNIQUE), options snapshot refreshed. */
export async function upsertWatchlistItem(event: MarketEvent): Promise<WatchlistItem> {
  const { data, error } = await createSupabaseAdminClient()
    .from("watchlist_items")
    .upsert(
      {
        polymarket_event_id: event.id,
        slug: event.slug,
        title: event.title,
        options: event.options,
        volume: event.volume,
        end_date: event.endDate,
        removed_at: null,
      },
      { onConflict: "polymarket_event_id" },
    )
    .select("*")
    .single();
  if (error) fail("adding to the watchlist", error.message);
  return data as WatchlistItem;
}

export async function getWatchlistItem(id: string): Promise<WatchlistItem | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("watchlist_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("reading a watchlist item", error.message);
  return (data as WatchlistItem | null) ?? null;
}

export async function removeWatchlistItem(id: string): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from("watchlist_items")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) fail("removing a watchlist item", error.message);
  return (data ?? []).length > 0;
}
