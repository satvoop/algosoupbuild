import type { MarketOption } from "@/lib/polymarket";
import type { RunRecord } from "@/lib/db/runs";
import { checkJsonOutput, jsonInstruction, renderPrompt, type RunArticle } from "@/lib/strategy/template";
import { extractJson } from "@/lib/llm";
import { errorMessage } from "@/lib/http";

export interface ExecuteInput {
  strategy: { id: string; name: string; prompt_template: string; output_type: "text" | "json"; output_schema: Record<string, unknown> | null };
  item: { id: string; title: string; options: MarketOption[] };
  articles: RunArticle[];
  model: string;
  ask: (prompt: string) => Promise<string>;
}

/** Renders, calls the model and builds the run record; failures become a stored failed run (AC11). */
export async function executeStrategy(input: ExecuteInput): Promise<RunRecord> {
  const { strategy, item, articles } = input;
  let prompt = renderPrompt(strategy.prompt_template, item.title, item.options, articles);
  if (strategy.output_type === "json" && strategy.output_schema) prompt += jsonInstruction(strategy.output_schema);
  const base = {
    strategy_id: strategy.id, watchlist_item_id: item.id, strategy_name: strategy.name, prompt_rendered: prompt, model: input.model,
    inputs_snapshot: { event_title: item.title, options: item.options, articles, no_news: articles.length === 0, captured_at: new Date().toISOString() },
  };
  let text: string;
  try {
    text = await input.ask(prompt);
  } catch (error) {
    return { ...base, output_text: null, output_json: null, status: "error", error: errorMessage(error) };
  }
  if (strategy.output_type === "text") return { ...base, output_text: text, output_json: null, status: "ok", error: null };
  const parsed = extractJson(text);
  const problem = checkJsonOutput(parsed, strategy.output_schema ?? {});
  if (problem) return { ...base, output_text: text, output_json: null, status: "error", error: problem };
  return { ...base, output_text: null, output_json: parsed, status: "ok", error: null };
}
