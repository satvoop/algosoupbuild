"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client. Uses only the publishable key, so what it can reach is
 * decided entirely by RLS. Next.js inlines NEXT_PUBLIC_* at build time, which
 * is why the names are written out literally here.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return createBrowserClient(url, key);
}
