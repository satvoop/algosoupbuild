import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface RunRecord {
  strategy_id: string;
  watchlist_item_id: string;
  strategy_name: string;
  prompt_rendered: string;
  inputs_snapshot: Record<string, unknown>;
  output_text: string | null;
  output_json: unknown;
  model: string;
  status: "ok" | "error";
  error: string | null;
}

export interface StoredRun extends RunRecord {
  id: string;
  created_at: string;
}

export async function insertRun(run: RunRecord): Promise<StoredRun> {
  const { data, error } = await createSupabaseAdminClient().from("analysis_runs").insert(run).select("*").single();
  if (error) throw new Error(`Database error while storing a run: ${error.message}`);
  return data as StoredRun;
}

export async function listRuns(itemId: string): Promise<StoredRun[]> {
  const { data, error } = await createSupabaseAdminClient().from("analysis_runs").select("*")
    .eq("watchlist_item_id", itemId).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(`Database error while listing runs: ${error.message}`);
  return (data ?? []) as StoredRun[];
}
