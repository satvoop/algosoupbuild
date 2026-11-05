import type { MarketOption } from "@/lib/polymarket";

export const PLACEHOLDERS = ["event_title", "options", "articles", "article_count"] as const;
export type OutputType = "text" | "json";

export interface StrategyInput {
  name: string;
  description: string | null;
  promptTemplate: string;
  outputType: OutputType;
  outputSchema: Record<string, unknown> | null;
}

export interface RunArticle {
  title: string;
  source: string | null;
  published_at: string | null;
  snippet: string | null;
  url: string;
}

/** Validates a strategy before save (AC8). Returns the cleaned input or an error message. */
export function validateStrategy(body: unknown): StrategyInput | string {
  const raw = (body ?? {}) as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name.length < 1 || name.length > 120) return "Name must be 1-120 characters";
  const promptTemplate = typeof raw.promptTemplate === "string" ? raw.promptTemplate : "";
  if (promptTemplate.trim().length === 0 || promptTemplate.length > 8000) return "Prompt template must be 1-8000 characters";
  const unknown = [...promptTemplate.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)]
    .map((match) => match[1] ?? "")
    .filter((key) => !(PLACEHOLDERS as readonly string[]).includes(key));
  if (unknown.length > 0) return `Unknown placeholder: {{${unknown[0]}}}`;
  if (raw.outputType !== "text" && raw.outputType !== "json") return "Output type must be text or json";
  let outputSchema: Record<string, unknown> | null = null;
  if (raw.outputType === "json") {
    const schema = typeof raw.outputSchema === "string" ? safeParse(raw.outputSchema) : raw.outputSchema;
    if (typeof schema !== "object" || schema === null || Array.isArray(schema)) return "JSON strategies need a schema that is a JSON object";
    outputSchema = schema as Record<string, unknown>;
  }
  const description = typeof raw.description === "string" && raw.description.trim() ? raw.description.trim().slice(0, 500) : null;
  return { name, description, promptTemplate, outputType: raw.outputType, outputSchema };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

export function renderPrompt(template: string, title: string, options: MarketOption[], articles: RunArticle[]): string {
  const optionText = options.map((option) => `${option.label} (${option.yesPrice ?? "n/a"})`).join("; ");
  const articleText = articles.length === 0
    ? "(no news articles available)"
    : articles.map((article, index) => `[${index + 1}] ${article.title} - ${article.source ?? "unknown"}, ${article.published_at?.slice(0, 10) ?? "undated"}: ${article.snippet ?? ""}`).join("\n");
  const values: Record<string, string> = { event_title: title, options: optionText, articles: articleText, article_count: String(articles.length) };
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (whole, key: string) => values[key] ?? whole);
}

export function jsonInstruction(schema: Record<string, unknown>): string {
  return `\n\nReturn ONLY a JSON object matching this schema, no prose:\n${JSON.stringify(schema)}`;
}

/** Checks a JSON output against the schema's required keys (AC11). */
export function checkJsonOutput(output: unknown, schema: Record<string, unknown>): string | null {
  if (typeof output !== "object" || output === null || Array.isArray(output)) return "Output was not a JSON object";
  const required = Array.isArray(schema.required) ? schema.required.filter((key): key is string => typeof key === "string") : [];
  const missing = required.filter((key) => !(key in output));
  return missing.length > 0 ? `Output is missing required keys: ${missing.join(", ")}` : null;
}
