import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface CookieAdapter {
  getAll: () => unknown;
  setAll: (cookies: { name: string; value: string; options: object }[]) => void;
}

const captured: { adapter?: CookieAdapter } = {};
const cookieSet = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: CookieAdapter }) => {
    captured.adapter = options.cookies;
    return {};
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: cookieSet }),
}));

const { createSupabaseServerClient } = await import("./server");

const ONE_COOKIE = [{ name: "sb", value: "v", options: {} }];

describe("createSupabaseServerClient cookie handling", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable";
    cookieSet.mockReset();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  it("writes cookies when the context allows it", async () => {
    await createSupabaseServerClient();
    captured.adapter?.setAll(ONE_COOKIE);
    expect(cookieSet).toHaveBeenCalledWith("sb", "v", {});
  });

  it("ignores only the read-only cookie error a Server Component raises", async () => {
    cookieSet.mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler.");
    });
    await createSupabaseServerClient();
    expect(() => captured.adapter?.setAll(ONE_COOKIE)).not.toThrow();
  });

  it("rethrows any other cookie failure", async () => {
    cookieSet.mockImplementation(() => {
      throw new Error("disk full");
    });
    await createSupabaseServerClient();
    expect(() => captured.adapter?.setAll(ONE_COOKIE)).toThrow("disk full");
  });

  it("fails loudly, by name, when the Supabase URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(createSupabaseServerClient()).rejects.toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });
});
