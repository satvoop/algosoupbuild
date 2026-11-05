import { describe, expect, it } from "vitest";
import { createSessionToken, passwordMatches, verifySessionToken } from "@/lib/auth/session";

describe("session token", () => {
  it("accepts its own token and rejects tampered, expired or foreign ones", async () => {
    const token = await createSessionToken("pw-one", 1000);
    expect(await verifySessionToken("pw-one", token, 2000)).toBe(true);
    expect(await verifySessionToken("pw-two", token, 2000)).toBe(false);
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(await verifySessionToken("pw-one", tampered, 2000)).toBe(false);
    expect(await verifySessionToken("pw-one", token, 1000 + 8 * 24 * 3600 * 1000)).toBe(false);
    expect(await verifySessionToken("pw-one", undefined, 2000)).toBe(false);
  });
  it("compares passwords", async () => {
    expect(await passwordMatches("secret", "secret")).toBe(true);
    expect(await passwordMatches("secret", "Secret")).toBe(false);
  });
});
