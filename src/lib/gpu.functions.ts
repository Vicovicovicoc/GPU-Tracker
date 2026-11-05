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

// Réservé aux administrateurs, comme triggerRefresh. La tâche planifiée (/api/public/jobs/refresh)
// appelle syncBatches directement, avec son propre secret : elle n'est pas concernée.
export const syncRefresh = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("@/lib/server/admin.server");
    await requireAdmin(context.userId);
    const { syncBatches } = await import("@/lib/server/scraper.server");
    return syncBatches();
  });

// Limité côté serveur (1 par minute, 5 par 24 h et par utilisateur) : masquer le bouton ne suffirait pas.
// Le rapport quotidien automatique appelle sendDailyReport directement et n'est pas limité.
export const sendTestReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { consumeTestReportQuota } = await import("@/lib/server/rate-limit.server");
    const quota = await consumeTestReportQuota(context.userId);
    if (!quota.allowed) return { sent: false, limited: quota.reason };
    const { sendDailyReport } = await import("@/lib/server/scraper.server");
    const ok = await sendDailyReport(context.userId);
    return { sent: ok, limited: null };
  });
