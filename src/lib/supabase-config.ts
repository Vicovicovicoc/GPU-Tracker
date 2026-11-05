/**
 * Checks whether the public Supabase URL and publishable key are available.
 * Supports Vite's browser variables and the server-side Lovable environment.
 */
export function hasSupabaseConfig(values: { url?: string; key?: string }): boolean {
  return Boolean(values.url?.trim() && values.key?.trim());
}

export function isSupabaseConfigured(): boolean {
  const serverEnv = typeof process !== "undefined" ? process.env : undefined;
  return hasSupabaseConfig({
    url: import.meta.env.VITE_SUPABASE_URL || serverEnv?.SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || serverEnv?.SUPABASE_PUBLISHABLE_KEY,
  });
}
