import type { NextConfig } from "next";

// Content-Security-Policy, ENFORCED in production builds. Next.js emits inline
// scripts for hydration, so script-src allows 'unsafe-inline' until a nonce-based
// policy is added (a proxy that sets a per-request nonce; see the Next.js CSP guide).
// That is the one known gap; every other directive is strict. `next dev` gets no
// CSP because the dev server needs eval for fast refresh. The Playwright smoke
// test runs against a production build and fails on any CSP violation.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseRealtime = supabaseUrl.replace(/^http/, "ws");

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${supabaseUrl} ${supabaseRealtime}`.trim(),
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const isProduction = process.env.NODE_ENV === "production";

const securityHeaders = [
  // No `preload`: preloading is a long-lived commitment for a custom domain, made
  // deliberately per product, not by a template.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProduction ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
