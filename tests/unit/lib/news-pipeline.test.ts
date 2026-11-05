import { describe, expect, it } from "vitest";
import { runNewsPipeline } from "@/lib/news/pipeline";
import { parseCurrentsDate, toArticle } from "@/lib/news/currents";
import type { NewsSource } from "@/lib/news/types";

const article = (n: number) => ({ url: `https://news.test/${n}`, title: `Story ${n}`, source: "news.test", publishedAt: null, snippet: null });
const source = (results: Record<string, ReturnType<typeof article>[]>): NewsSource => ({
  provider: "currents",
  search: async (keywords) => results[keywords] ?? [],
});

describe("news pipeline (M3 v2)", () => {
  it("adds the title query, strips years, dedupes and keeps scores >= 0.5", async () => {
    const asked: string[] = [];
    const ask = async (prompt: string) => {
      asked.push(prompt);
      return asked.length === 1 ? '{"queries": ["F1 title 2025", "Antonelli"]}' : '[{"i":0,"s":0.9},{"i":1,"s":0.2},{"i":2,"s":0.6}]';
    };
    const result = await runNewsPipeline(source({ "F1 Champion": [article(1), article(2)], "F1 title": [article(1), article(3)], Antonelli: [] }), ask, "F1 Champion", ["Antonelli"]);
    expect(result.queries).toEqual(["F1 Champion", "F1 title", "Antonelli"]);
    expect(result.candidateCount).toBe(3);
    expect(result.filterApplied).toBe(true);
    expect(result.kept.map((a) => a.url)).toEqual(["https://news.test/1", "https://news.test/3"]);
  });
  it("keeps the unfiltered list when the filter reply is not JSON", async () => {
    let call = 0;
    const ask = async () => (call++ === 0 ? "no json here" : "sorry, cannot");
    const result = await runNewsPipeline(source({ Event: [article(1)] }), ask, "Event", []);
    expect(result.filterApplied).toBe(false);
    expect(result.kept).toHaveLength(1);
  });
  it("propagates a source error", async () => {
    const failing: NewsSource = { provider: "currents", search: async () => { throw new Error("Currents rate limit reached"); } };
    await expect(runNewsPipeline(failing, async () => "{}", "Event", [])).rejects.toThrow(/rate limit/);
  });
  it("parses Currents dates and rejects non-http urls", () => {
    expect(parseCurrentsDate("2026-11-04 23:39:13 +0000")).toBe("2026-11-04T23:39:13Z");
    expect(toArticle({ url: "javascript:alert(1)", title: "x" })).toBeNull();
  });
});
