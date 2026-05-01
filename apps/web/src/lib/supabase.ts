import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/**
 * Supabase client for the web frontend.
 * Uses the anon (public) key — all operations go through RLS.
 *
 * If VITE_SUPABASE_URL is not set, the client will be null
 * and the app falls back to the Express API.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function isSupabaseEnabled(): boolean {
  return supabase !== null;
}
