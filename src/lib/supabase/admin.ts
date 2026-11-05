import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PUBLIC_ENV, SERVER_ENV, requireEnv } from "@/lib/env";

/**
 * Secret-key client: BYPASSES RLS. Only for server work that is not acting
 * for a signed-in user (webhooks, scheduled jobs). The calling code must make
 * its own authorization decision before every operation through this client.
 * `server-only` stops it ever reaching a browser bundle.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  return createClient(
    requireEnv(PUBLIC_ENV.supabaseUrl),
    requireEnv(SERVER_ENV.supabaseSecretKey),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
