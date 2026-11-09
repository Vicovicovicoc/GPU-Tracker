/**
 * Checks whether the public Supabase URL and publishable key are available.
 * Supports Vite's browser variables and the server-side Lovable environment.
 *
 * NOTE: this is a presence-only check (non-empty string). It verifies that the
 * public frontend configuration reached the current runtime; it does not test
 * the connection itself. Both the browser bundle (import.meta.env) and the
 * server environment (process.env) are accepted so that SSR and client renders
 * agree on the same answer.
 * Production builds capture the public frontend configuration at build time.
 */
export function hasSupabaseConfig(values: { url?: string | undefined; key?: string | undefined }): boolean {
  return Boolean(values.url?.trim() && values.key?.trim());
}

export function isSupabaseConfigured(): boolean {
  const serverEnv = typeof process !== "undefined" ? process.env : undefined;
  return hasSupabaseConfig({
    // Dot notation is required: Vite/OXC `define` only replaces static member access.
    url: import.meta.env.VITE_SUPABASE_URL || serverEnv?.["SUPABASE_URL"],
    key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || serverEnv?.["SUPABASE_PUBLISHABLE_KEY"],
  });
}
