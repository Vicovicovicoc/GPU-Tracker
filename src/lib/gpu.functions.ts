import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Réservé aux administrateurs : chaque relevé forcé consomme des crédits Firecrawl.
// Le relevé automatique (tâche planifiée) reste inchangé et ne passe pas par ici.
export const triggerRefresh = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("@/lib/server/admin.server");
    await requireAdmin(context.userId);
    const { startRefresh } = await import("@/lib/server/scraper.server");
    return startRefresh({ force: true });
  });

export const syncRefresh = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { syncBatches } = await import("@/lib/server/scraper.server");
    return syncBatches();
  });

export const sendTestReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendDailyReport } = await import("@/lib/server/scraper.server");
    const ok = await sendDailyReport(context.userId);
    return { sent: ok };
  });
