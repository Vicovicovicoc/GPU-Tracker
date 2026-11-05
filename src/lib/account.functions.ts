import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Supprime définitivement le compte de l'utilisateur connecté et ses données personnelles.
 * L'identité vient uniquement du jeton vérifié par `requireSupabaseAuth` : aucun
 * identifiant n'est accepté en paramètre, un utilisateur ne peut donc supprimer que son propre compte.
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Ces tables ne sont pas reliées à auth.users par une clé étrangère : on les nettoie explicitement.
    for (const table of ["alert_log", "watchlist", "user_settings"] as const) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
      if (error) {
        console.error(`[deleteAccount] suppression dans ${table} impossible`, error);
        throw new Error("Impossible de supprimer vos données. Réessayez plus tard.");
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[deleteAccount] suppression de l'utilisateur impossible", error);
      throw new Error("Impossible de supprimer le compte. Réessayez plus tard.");
    }
    return { deleted: true as const };
  });

/** Indique si l'utilisateur connecté est administrateur (sert à afficher ou masquer les actions réservées). */
export const getIsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAdmin } = await import("@/lib/server/admin.server");
    return { isAdmin: await isAdmin(context.userId) };
  });
