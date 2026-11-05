/**
 * Shared-password session: the cookie holds "<expiryMs>.<hmacHex>", signed with
 * APP_PASSWORD. Changing the password invalidates every cookie. Web Crypto only,
 * so the same code runs in the proxy and in route handlers.
 */
export const SESSION_COOKIE = "algosoup_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export async function createSessionToken(secret: string, nowMs: number): Promise<string> {
  const expiry = String(nowMs + SESSION_TTL_MS);
  return `${expiry}.${await hmacHex(secret, `session:${expiry}`)}`;
}

export async function verifySessionToken(
  secret: string,
  token: string | undefined,
  nowMs: number,
): Promise<boolean> {
  if (!token) return false;
  const [expiry, signature, extra] = token.split(".");
  if (!expiry || !signature || extra !== undefined) return false;
  const expiryMs = Number(expiry);
  if (!Number.isFinite(expiryMs) || expiryMs <= nowMs) return false;
  return constantTimeEqual(signature, await hmacHex(secret, `session:${expiry}`));
}

export async function passwordMatches(secret: string, attempt: string): Promise<boolean> {
  const [expected, given] = await Promise.all([hmacHex(secret, "pw"), hmacHex(attempt, "pw")]);
  return constantTimeEqual(expected, given);
}
