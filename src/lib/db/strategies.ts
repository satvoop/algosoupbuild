import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OutputType, StrategyInput } from "@/lib/strategy/template";

export interface Strategy {
  id: string;
  name: string;
  description: string | null;
  prompt_template: string;
  output_type: OutputType;
  output_schema: Record<string, unknown> | null;
  is_seed: boolean;
  archived_at: string | null;
}

export class DuplicateNameError extends Error {}

function toRow(input: StrategyInput) {
  return { name: input.name, description: input.description, prompt_template: input.promptTemplate, output_type: input.outputType, output_schema: input.outputSchema };
}

function check(action: string, error: { code?: string; message: string } | null): void {
  if (!error) return;
  if (error.code === "23505") throw new DuplicateNameError("An active strategy already has that name");
  throw new Error(`Database error while ${action}: ${error.message}`);
}

export async function listStrategies(): Promise<Strategy[]> {
  const { data, error } = await createSupabaseAdminClient().from("strategies").select("*").is("archived_at", null).order("created_at");
  check("listing strategies", error);
  return (data ?? []) as Strategy[];
}

export async function getStrategy(id: string): Promise<Strategy | null> {
  const { data, error } = await createSupabaseAdminClient().from("strategies").select("*").eq("id", id).maybeSingle();
  check("reading a strategy", error);
  return (data as Strategy | null) ?? null;
}

export async function createStrategy(input: StrategyInput): Promise<Strategy> {
  const { data, error } = await createSupabaseAdminClient().from("strategies").insert(toRow(input)).select("*").single();
  check("creating a strategy", error);
  return data as Strategy;
}

export async function updateStrategy(id: string, input: StrategyInput): Promise<Strategy | null> {
  const { data, error } = await createSupabaseAdminClient().from("strategies")
    .update({ ...toRow(input), updated_at: new Date().toISOString() }).eq("id", id).is("archived_at", null).select("*").maybeSingle();
  check("updating a strategy", error);
  return (data as Strategy | null) ?? null;
}

export async function archiveStrategy(id: string): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient().from("strategies")
    .update({ archived_at: new Date().toISOString() }).eq("id", id).is("archived_at", null).select("id");
  check("archiving a strategy", error);
  return (data ?? []).length > 0;
}
