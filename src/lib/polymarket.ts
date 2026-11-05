import { fetchWithTimeout } from "@/lib/http";

const EVENTS_URL =
  "https://gamma-api.polymarket.com/events?order=volume&ascending=false&closed=false&limit=10";

export interface MarketOption {
  label: string;
  yesPrice: number | null;
}

export interface MarketEvent {
  id: string;
  slug: string;
  title: string;
  volume: number | null;
  endDate: string | null;
  options: MarketOption[];
}

interface RawMarket {
  question?: unknown;
  groupItemTitle?: unknown;
  outcomes?: unknown;
  outcomePrices?: unknown;
  closed?: unknown;
}

function parseJsonArray(value: unknown): unknown[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
}

/** One option per child market (its Yes price); a single binary market lists Yes and No. */
export function toOptions(markets: RawMarket[]): MarketOption[] {
  const open = markets.filter((market) => market.closed !== true);
  if (open.length === 1 && open[0]) {
    const outcomes = parseJsonArray(open[0].outcomes);
    const prices = parseJsonArray(open[0].outcomePrices);
    return outcomes.map((label, index) => ({
      label: String(label),
      yesPrice: prices[index] === undefined ? null : Number(prices[index]),
    }));
  }
  return open
    .map((market) => {
      const prices = parseJsonArray(market.outcomePrices);
      const label = typeof market.groupItemTitle === "string" && market.groupItemTitle
        ? market.groupItemTitle
        : String(market.question ?? "");
      return { label, yesPrice: prices[0] === undefined ? null : Number(prices[0]) };
    })
    .sort((left, right) => (right.yesPrice ?? 0) - (left.yesPrice ?? 0))
    .slice(0, 5);
}

export function parseEvents(body: unknown): MarketEvent[] {
  if (!Array.isArray(body)) throw new Error("Polymarket returned an unexpected shape");
  return body.map((raw: Record<string, unknown>) => ({
    id: String(raw.id),
    slug: String(raw.slug ?? ""),
    title: String(raw.title ?? ""),
    volume: typeof raw.volume === "number" ? raw.volume : null,
    endDate: typeof raw.endDate === "string" ? raw.endDate : null,
    options: toOptions(Array.isArray(raw.markets) ? (raw.markets as RawMarket[]) : []),
  }));
}

export async function fetchTopEvents(): Promise<MarketEvent[]> {
  const response = await fetchWithTimeout(EVENTS_URL, { cache: "no-store" }, 15000);
  if (!response.ok) throw new Error(`Polymarket returned HTTP ${response.status}`);
  return parseEvents(await response.json());
}
