import { describe, expect, it } from "vitest";
import { checkJsonOutput, renderPrompt, validateStrategy } from "@/lib/strategy/template";
import { executeStrategy } from "@/lib/strategy/execute";

const strategy = { id: "s1", name: "Count", prompt_template: "M {{event_title}} {{article_count}}\n{{articles}}", output_type: "json" as const, output_schema: { type: "object", required: ["counts"] } };
const item = { id: "i1", title: "Event", options: [{ label: "A", yesPrice: 0.4 }] };

describe("strategy validation and execution", () => {
  it("rejects unknown placeholders and non-object schemas", () => {
    expect(validateStrategy({ name: "x", promptTemplate: "{{nope}}", outputType: "text" })).toBe("Unknown placeholder: {{nope}}");
    expect(validateStrategy({ name: "x", promptTemplate: "p", outputType: "json", outputSchema: "[1]" })).toMatch(/JSON object/);
    expect(validateStrategy({ name: "", promptTemplate: "p", outputType: "text" })).toMatch(/Name/);
    expect(validateStrategy({ name: "ok", promptTemplate: "{{options}}", outputType: "json", outputSchema: '{"required":["a"]}' })).toMatchObject({ outputSchema: { required: ["a"] } });
  });
  it("renders no-news runs and checks required keys", () => {
    expect(renderPrompt("{{articles}}|{{article_count}}", "E", [], [])).toBe("(no news articles available)|0");
    expect(checkJsonOutput({ a: 1 }, { required: ["a", "b"] })).toMatch(/b/);
  });
  it("stores ok json output, and a failed run with raw text when keys are missing", async () => {
    const ok = await executeStrategy({ strategy, item, articles: [], model: "m", ask: async () => '{"counts": []}' });
    expect(ok).toMatchObject({ status: "ok", output_json: { counts: [] }, inputs_snapshot: { no_news: true } });
    const bad = await executeStrategy({ strategy, item, articles: [], model: "m", ask: async () => '{"other": 1}' });
    expect(bad).toMatchObject({ status: "error", output_text: '{"other": 1}' });
    const down = await executeStrategy({ strategy, item, articles: [], model: "m", ask: async () => { throw new Error("Claude returned HTTP 529"); } });
    expect(down).toMatchObject({ status: "error", error: "Claude returned HTTP 529" });
  });
});
