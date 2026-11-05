import { beforeEach, describe, expect, it, vi } from "vitest";

const ITEM_ID = "11111111-1111-4111-8111-111111111111";
const STRATEGY_ID = "22222222-2222-4222-8222-222222222222";
const item = { id: ITEM_ID, polymarket_event_id: "1", slug: "e", title: "Event", options: [{ label: "A", yesPrice: 0.5 }], volume: 1, end_date: null, added_at: "2026-11-05T00:00:00Z", removed_at: null };
const strategy = { id: STRATEGY_ID, name: "News summary", description: null, prompt_template: "{{event_title}}", output_type: "text", output_schema: null, is_seed: true, archived_at: null };

const watchlist = { listWatchlist: vi.fn(), upsertWatchlistItem: vi.fn(), getWatchlistItem: vi.fn(), removeWatchlistItem: vi.fn() };
const news = { latestNews: vi.fn(), recordFetch: vi.fn(), recordFetchError: vi.fn() };
class DuplicateNameError extends Error {}
const strategies = { listStrategies: vi.fn(), getStrategy: vi.fn(), createStrategy: vi.fn(), updateStrategy: vi.fn(), archiveStrategy: vi.fn(), DuplicateNameError };
const runs = { insertRun: vi.fn(async (run: object) => ({ id: "r1", created_at: "now", ...run })), listRuns: vi.fn() };
const llm = { FAST_MODEL: "claude-haiku-4-5", callClaude: vi.fn(), extractJson: (text: string) => JSON.parse(text) as unknown };
const pipeline = { runNewsPipeline: vi.fn() };
const polymarket = { fetchTopEvents: vi.fn() };

vi.mock("@/lib/db/watchlist", () => watchlist);
vi.mock("@/lib/db/news", () => news);
vi.mock("@/lib/db/strategies", () => strategies);
vi.mock("@/lib/db/runs", () => runs);
vi.mock("@/lib/llm", () => llm);
vi.mock("@/lib/news/pipeline", () => pipeline);
vi.mock("@/lib/news/currents", () => ({ currentsSource: { provider: "currents", search: vi.fn() } }));
vi.mock("@/lib/polymarket", () => polymarket);

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (body: unknown) => new Request("http://test/x", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_PASSWORD = "test-password";
});

describe("/api/login", () => {
  it("sets the session cookie on the right password", async () => {
    const { POST } = await import("@/app/api/login/route");
    const response = await POST(post({ password: "test-password" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toMatch(/algosoup_session=.*HttpOnly/i);
  });
  it("rejects a wrong password without a cookie", async () => {
    const { POST } = await import("@/app/api/login/route");
    const response = await POST(post({ password: "nope" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("/api/markets", () => {
  it("returns events", async () => {
    polymarket.fetchTopEvents.mockResolvedValue([{ id: "1" }]);
    const { GET } = await import("@/app/api/markets/route");
    expect(await (await GET()).json()).toEqual({ events: [{ id: "1" }] });
  });
  it("returns 502 on a Polymarket error", async () => {
    polymarket.fetchTopEvents.mockRejectedValue(new Error("Polymarket returned HTTP 503"));
    const { GET } = await import("@/app/api/markets/route");
    expect((await GET()).status).toBe(502);
  });
});

describe("/api/watchlist", () => {
  it("lists and adds", async () => {
    watchlist.listWatchlist.mockResolvedValue([item]);
    watchlist.upsertWatchlistItem.mockResolvedValue(item);
    const route = await import("@/app/api/watchlist/route");
    expect((await (await route.GET()).json()).items).toHaveLength(1);
    expect((await route.POST(post({ id: "1", slug: "e", title: "Event", options: [] }))).status).toBe(201);
  });
  it("rejects an invalid event and reports db errors", async () => {
    const route = await import("@/app/api/watchlist/route");
    expect((await route.POST(post({ id: "x; drop", slug: "e", title: "t", options: [] }))).status).toBe(400);
    watchlist.listWatchlist.mockRejectedValue(new Error("db down"));
    expect((await route.GET()).status).toBe(500);
  });
});

describe("/api/watchlist/[id]", () => {
  it("returns detail and removes", async () => {
    watchlist.getWatchlistItem.mockResolvedValue(item);
    news.latestNews.mockResolvedValue({ fetch: null, articles: [] });
    runs.listRuns.mockResolvedValue([]);
    watchlist.removeWatchlistItem.mockResolvedValue(true);
    const route = await import("@/app/api/watchlist/[id]/route");
    expect((await route.GET(new Request("http://t"), params(ITEM_ID))).status).toBe(200);
    expect((await route.DELETE(new Request("http://t"), params(ITEM_ID))).status).toBe(200);
  });
  it("rejects bad ids and missing items", async () => {
    watchlist.getWatchlistItem.mockResolvedValue(null);
    const route = await import("@/app/api/watchlist/[id]/route");
    expect((await route.GET(new Request("http://t"), params("bad"))).status).toBe(400);
    expect((await route.GET(new Request("http://t"), params(ITEM_ID))).status).toBe(404);
  });
});

describe("/api/watchlist/[id]/news", () => {
  it("runs the pipeline and records the fetch", async () => {
    watchlist.getWatchlistItem.mockResolvedValue(item);
    pipeline.runNewsPipeline.mockResolvedValue({ queries: ["Event"], candidateCount: 1, filterApplied: true, kept: [] });
    news.latestNews.mockResolvedValue({ fetch: { status: "ok" }, articles: [] });
    const { POST } = await import("@/app/api/watchlist/[id]/news/route");
    expect((await POST(new Request("http://t"), params(ITEM_ID))).status).toBe(200);
    expect(news.recordFetch).toHaveBeenCalledOnce();
  });
  it("stores a failed fetch and returns 502 on a provider error", async () => {
    watchlist.getWatchlistItem.mockResolvedValue(item);
    pipeline.runNewsPipeline.mockRejectedValue(new Error("Currents rate limit reached"));
    const { POST } = await import("@/app/api/watchlist/[id]/news/route");
    expect((await POST(new Request("http://t"), params(ITEM_ID))).status).toBe(502);
    expect(news.recordFetchError).toHaveBeenCalledOnce();
  });
});

describe("/api/watchlist/[id]/runs", () => {
  it("runs a strategy and stores the run", async () => {
    watchlist.getWatchlistItem.mockResolvedValue(item);
    strategies.getStrategy.mockResolvedValue(strategy);
    news.latestNews.mockResolvedValue({ fetch: null, articles: [] });
    llm.callClaude.mockResolvedValue("A summary");
    const { POST } = await import("@/app/api/watchlist/[id]/runs/route");
    const response = await POST(post({ strategyId: STRATEGY_ID }), params(ITEM_ID));
    expect(response.status).toBe(201);
    expect((await response.json()).run).toMatchObject({ status: "ok", output_text: "A summary", strategy_name: "News summary" });
  });
  it("rejects an archived strategy and invalid ids", async () => {
    watchlist.getWatchlistItem.mockResolvedValue(item);
    strategies.getStrategy.mockResolvedValue({ ...strategy, archived_at: "2026-11-05" });
    const { POST } = await import("@/app/api/watchlist/[id]/runs/route");
    expect((await POST(post({ strategyId: STRATEGY_ID }), params(ITEM_ID))).status).toBe(404);
    expect((await POST(post({ strategyId: "x" }), params(ITEM_ID))).status).toBe(400);
  });
});

describe("/api/strategies", () => {
  it("lists, creates, updates and archives", async () => {
    strategies.listStrategies.mockResolvedValue([strategy]);
    strategies.createStrategy.mockResolvedValue(strategy);
    strategies.updateStrategy.mockResolvedValue(strategy);
    strategies.archiveStrategy.mockResolvedValue(true);
    const list = await import("@/app/api/strategies/route");
    const one = await import("@/app/api/strategies/[id]/route");
    const body = { name: "New", promptTemplate: "{{event_title}}", outputType: "text" };
    expect((await list.GET()).status).toBe(200);
    expect((await list.POST(post(body))).status).toBe(201);
    expect((await one.PUT(post(body), params(STRATEGY_ID))).status).toBe(200);
    expect((await one.DELETE(new Request("http://t"), params(STRATEGY_ID))).status).toBe(200);
  });
  it("rejects invalid input and duplicate names", async () => {
    strategies.createStrategy.mockRejectedValue(new DuplicateNameError("An active strategy already has that name"));
    const list = await import("@/app/api/strategies/route");
    expect((await list.POST(post({ name: "x", promptTemplate: "{{bad}}", outputType: "text" }))).status).toBe(400);
    expect((await list.POST(post({ name: "x", promptTemplate: "p", outputType: "text" }))).status).toBe(409);
  });
});
