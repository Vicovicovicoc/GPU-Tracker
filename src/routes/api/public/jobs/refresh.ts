import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { syncBatches, startRefresh } = await import("@/lib/server/scraper.server");
        try {
          const sync = await syncBatches();
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
