import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const triggerRefresh = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
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
