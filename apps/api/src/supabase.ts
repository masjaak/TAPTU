import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { ApiConfig } from "./config";

export type SupabaseAdmin = SupabaseClient;

/**
 * Creates a Supabase client using the service_role key.
 * This client bypasses RLS and should only be used server-side.
 */
export function createSupabaseAdmin(config: ApiConfig): SupabaseAdmin {
  const url = config.supabase.url;
  const key = config.supabase.serviceRoleKey;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when TAPTU_STORAGE_MODE=supabase"
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
