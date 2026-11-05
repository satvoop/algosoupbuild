/** The news prompts that won the 2026-11-05 experiment (M3 v2), verbatim in substance. */
export function keywordPrompt(title: string, options: string[]): string {
  return `You generate news search queries for a prediction-market trader.
Event: "${title}"
Leading outcomes: ${options.join("; ")}

If the outcomes are dates or price levels rather than names, ignore them and build queries from the event's subject and the mechanism that would resolve it (e.g. coalition talks, a vote, a court ruling).
Write 2 short keyword queries (2-4 words each) that a news search engine would match against headlines about this event. Use the proper nouns that appear in news coverage (people, teams, countries, institutions), not market phrasing like "will", "winner", "2026", "by date". Each query must be specific to this event, not a generic topic.

Return ONLY JSON: {"queries": ["...", "..."]}`;
}

export function relevancePrompt(
  title: string,
  options: string[],
  articles: { title: string; snippet: string | null }[],
): string {
  const list = articles.map((article, index) => `${index}. ${article.title} | ${(article.snippet ?? "").slice(0, 200)}`).join("\n");
  return `You filter news for a prediction-market trader.
Event: "${title}"
Leading outcomes: ${options.join("; ")}

Score each article 0-1 for how useful it is to someone estimating this event's outcome. 1 = directly about the event or a leading outcome's prospects; 0.5 = materially related context (same race/match/negotiation); 0 = different topic or only a name collision.

Articles:
${list}

Return ONLY a JSON array with one entry per article, using the article's number as "i": [{"i": 0, "s": 0.0}]`;
}

/** Strips 4-digit years and market phrasing the model sometimes adds anyway. */
export function cleanQuery(query: string): string {
  return query.replace(/\b(19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim();
}
