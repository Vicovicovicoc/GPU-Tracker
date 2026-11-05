import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Limitation de débit appliquée côté serveur, dans la base (fonction `consume_rate_limit`,
 * migration 0003). Le compteur n'est lisible et modifiable qu'avec la clé de service :
 * un utilisateur ne peut pas le remettre à zéro depuis le navigateur.
 */

/** Rapport test : un envoi par minute et cinq par 24 h et par utilisateur. */
export const TEST_REPORT_LIMITS = {
  burst: { action: "test_report_burst", max: 1, windowSeconds: 60 },
  daily: { action: "test_report_daily", max: 5, windowSeconds: 24 * 3600 },
} as const;

export type TestReportQuota =
  | { allowed: true }
  | { allowed: false; reason: "burst" | "daily" | "unavailable" };

type Limit = { action: string; max: number; windowSeconds: number };

/** `true` si l'action est autorisée (et comptée). Toute erreur refuse l'accès. */
async function consume(userId: string, limit: Limit): Promise<boolean | "error"> {
  // La fonction SQL n'apparaît pas encore dans les types générés par Supabase : client non typé.
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data, error } = await db.rpc("consume_rate_limit", {
    _user_id: userId,
    _action: limit.action,
    _max_count: limit.max,
    _window_seconds: limit.windowSeconds,
  });
  if (error) {
    console.error("[rate-limit] consume_rate_limit a échoué", error);
    return "error";
  }
  return data === true;
}

/**
 * Réserve un envoi de rapport test pour l'utilisateur. L'intervalle court est vérifié en premier :
 * un doublon immédiat ne consomme pas le quota journalier.
 */
export async function consumeTestReportQuota(userId: string): Promise<TestReportQuota> {
  const burst = await consume(userId, TEST_REPORT_LIMITS.burst);
  if (burst === "error") return { allowed: false, reason: "unavailable" };
  if (!burst) return { allowed: false, reason: "burst" };

  const daily = await consume(userId, TEST_REPORT_LIMITS.daily);
  if (daily === "error") return { allowed: false, reason: "unavailable" };
  if (!daily) return { allowed: false, reason: "daily" };

  return { allowed: true };
}
