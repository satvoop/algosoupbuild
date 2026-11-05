import type { MarketEvent } from "@/lib/polymarket";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/** Validates a client-sent event before it is stored. Returns null when invalid. */
export function parseMarketEvent(body: unknown): MarketEvent | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = body as Record<string, unknown>;
  const { id, slug, title, options } = raw;
  if (typeof id !== "string" || !/^[0-9]{1,20}$/.test(id)) return null;
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,300}$/.test(slug)) return null;
  if (typeof title !== "string" || title.length === 0 || title.length > 500) return null;
  if (!Array.isArray(options) || options.length > 20) return null;
  const cleanOptions = options.map((option: unknown) => {
    const item = (option ?? {}) as Record<string, unknown>;
    return {
      label: String(item.label ?? "").slice(0, 200),
      yesPrice: typeof item.yesPrice === "number" ? item.yesPrice : null,
    };
  });
  return {
    id,
    slug,
    title,
    options: cleanOptions,
    volume: typeof raw.volume === "number" ? raw.volume : null,
    endDate: typeof raw.endDate === "string" ? raw.endDate : null,
  };
}
