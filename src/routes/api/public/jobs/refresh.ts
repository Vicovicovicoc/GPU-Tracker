import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { isParisHour } from "@/lib/refresh-schedule";

export const Route = createFileRoute("/api/public/jobs/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { syncBatches, startRefresh } = await import("@/lib/server/scraper.server");
        try {
          // Keep syncing completed batches whenever the scheduler calls us, but only
          // launch a new scrape at 06:00 Europe/Paris (summer and winter time).
          const sync = await syncBatches();
          if (!isParisHour(new Date(), 6)) {
            return Response.json({ success: true, sync, start: { started: false, reason: "Prochain relevé automatique à 06:00 (heure de Paris)" } });
          }
          const start = await startRefresh();
          return Response.json({ success: true, sync, start });
        } catch (e) {
          console.error("refresh job failed", e);
          return Response.json({ success: false, error: String(e) }, { status: 500 });
        }
      },
    },
  },
});
