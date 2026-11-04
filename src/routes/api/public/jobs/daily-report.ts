import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Scheduled at 06:00 and 07:00 UTC; only sends when it is 8 h in Paris (handles summer/winter time). */
export const Route = createFileRoute("/api/public/jobs/daily-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const parisHour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", hour12: false, timeZone: "Europe/Paris" }).format(new Date()));
        if (parisHour !== 8) return Response.json({ success: true, skipped: true });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendDailyReport } = await import("@/lib/server/scraper.server");
        const { data: users } = await supabaseAdmin.from("user_settings").select("user_id").eq("daily_report", true);
        let sent = 0;
        for (const u of users ?? []) {
          try { if (await sendDailyReport(u.user_id)) sent++; } catch (e) { console.error("report failed", u.user_id, e); }
        }
        return Response.json({ success: true, sent });
      },
    },
  },
});
