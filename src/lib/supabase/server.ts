import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PUBLIC_ENV, requireEnv } from "@/lib/env";

/**
 * Request-scoped client carrying the visitor's session (publishable key plus
 * cookies). Subject to RLS: even misused, it cannot read past a policy.
 * Use this for everything a signed-in user does.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnv(PUBLIC_ENV.supabaseUrl),
    requireEnv(PUBLIC_ENV.supabasePublishableKey),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch (error: unknown) {
            // Server Components cannot set cookies. That one case is expected:
            // the session refresh happens on the next Route Handler or Server
            // Action instead. Anything else is a real failure and is rethrown.
            const readOnly =
              error instanceof Error && error.message.includes("Cookies can only be modified");
            if (!readOnly) throw error;
          }
        },
      },
    },
  );
}
