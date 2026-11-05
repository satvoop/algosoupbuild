import { describe, expect, it } from "vitest";
import { parseEvents } from "@/lib/polymarket";

const FIXTURE = [
  { id: "1", slug: "dem-nominee", title: "Democratic Nominee", volume: 1.3e9, endDate: "2028-11-07T00:00:00Z", markets: [
    { groupItemTitle: "Ossoff", outcomePrices: "[\"0.26\",\"0.74\"]" },
    { groupItemTitle: "AOC", outcomePrices: "[\"0.15\",\"0.85\"]" },
    { groupItemTitle: "Closed one", outcomePrices: "[\"0.9\",\"0.1\"]", closed: true },
  ] },
  { id: "2", slug: "aliens", title: "Aliens?", volume: 4.5e7, markets: [{ outcomes: "[\"Yes\",\"No\"]", outcomePrices: "[\"0.02\",\"0.98\"]" }] },
];

describe("parseEvents", () => {
  it("maps child markets to options by Yes price and binary markets to Yes/No", () => {
    const [multi, binary] = parseEvents(FIXTURE);
    expect(multi?.options).toEqual([{ label: "Ossoff", yesPrice: 0.26 }, { label: "AOC", yesPrice: 0.15 }]);
    expect(binary?.options).toEqual([{ label: "Yes", yesPrice: 0.02 }, { label: "No", yesPrice: 0.98 }]);
    expect(binary?.endDate).toBeNull();
  });
  it("rejects an unexpected shape", () => {
    expect(() => parseEvents({ error: "x" })).toThrow(/unexpected shape/);
  });
});
