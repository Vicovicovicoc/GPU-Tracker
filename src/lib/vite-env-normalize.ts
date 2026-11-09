/**
 * Rewrites bracket access to the public Supabase env vars into dot notation,
 * so Vite's static `define` replacement injects them into production bundles.
 * Used by a pre-transform plugin on the auto-generated Supabase client.
 */
const PATTERNS: Array<[RegExp, string]> = [
  [/import\.meta\.env\s*\[\s*(['"])VITE_SUPABASE_URL\1\s*\]/g, "import.meta.env.VITE_SUPABASE_URL"],
  [
    /import\.meta\.env\s*\[\s*(['"])VITE_SUPABASE_PUBLISHABLE_KEY\1\s*\]/g,
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY",
  ],
];

export const SUPABASE_CLIENT_ID_RE =
  /[\\/]src[\\/]integrations[\\/]supabase[\\/]client\.ts(\?.*)?$/;

export function normalizeSupabaseEnvAccess(code: string): string {
  return PATTERNS.reduce((acc, [re, to]) => acc.replace(re, to), code);
}

export function supabaseEnvNormalizePlugin() {
  return {
    name: "normalize-supabase-client-env",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (!SUPABASE_CLIENT_ID_RE.test(id)) return null;
      const out = normalizeSupabaseEnvAccess(code);
      return out === code ? null : { code: out, map: null };
    },
  };
}
