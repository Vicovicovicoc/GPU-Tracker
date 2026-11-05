import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Indique si l'utilisateur a le rôle « admin » (table user_roles).
 * Par prudence, toute erreur de lecture (table absente, base injoignable) donne `false` :
 * en cas de doute, l'accès est refusé.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  // user_roles n'apparaît pas encore dans les types générés par Supabase : client non typé.
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data, error } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) {
    console.error("[isAdmin] lecture de user_roles impossible", error);
    return false;
  }
  return data !== null;
}

/** Lève une erreur si l'utilisateur n'est pas administrateur. */
export async function requireAdmin(userId: string): Promise<void> {
  if (!(await isAdmin(userId))) {
    throw new Error("Action réservée aux administrateurs.");
  }
}
