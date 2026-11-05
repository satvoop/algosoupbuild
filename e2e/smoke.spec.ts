import { expect, test } from "@playwright/test";

const againstDeployment = process.env.BASE_URL !== undefined;

// CSP violations are collected from the browser's own `securitypolicyviolation`
// event, which carries the blocked URL as data. Console wording differs between
// browser versions; the event does not.
const VERCEL_TOOLBAR = "https://vercel.live";

// Exact origin, so a look-alike such as https://vercel.live.evil.test is not excused.
// blockedURI is sometimes a keyword ("inline", "eval"), which has no origin.
function originOf(blocked: string): string {
  try {
    return new URL(blocked).origin;
  } catch (error) {
    if (error instanceof TypeError) return blocked; // not a URL: a keyword such as "inline"
    throw error;
  }
}

test("home page renders with no page errors and no CSP violations", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  await page.addInitScript(() => {
    const store = window as unknown as { __csp: string[] };
    store.__csp = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      store.__csp.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("main")).toBeVisible();
  await page.waitForLoadState("networkidle");
  const violations = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
  // Vercel injects its feedback toolbar into PREVIEW deployments only; the policy
  // blocking that one origin is intended. Anything else blocked is a defect.
  const unexpected = violations.filter((line) => originOf(line.split(" ")[1] ?? "") !== VERCEL_TOOLBAR);
  expect([...problems, ...unexpected]).toEqual([]);
});

test("health endpoint reports the commit that should be live", async ({ request }) => {
  const expected = process.env.EXPECTED_SHA;
  // Against a deployment, a 200 from the OLD build would pass a bare status check,
  // so the expected commit is required there.
  if (againstDeployment) expect(expected, "set EXPECTED_SHA when BASE_URL is set").toBeTruthy();
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { ok: boolean; sha: string };
  expect(body.ok).toBe(true);
  if (expected) expect(body.sha).toBe(expected);
});

test("security headers are served", async ({ request }) => {
  const headers = (await request.get("/")).headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-powered-by"]).toBeUndefined();
});
