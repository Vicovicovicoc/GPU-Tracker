import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Non-régression : les tâches planifiées s'authentifient avec leur propre secret (authenticateCronRequest)
// et ne doivent dépendre ni du rôle administrateur, ni de la limitation du rapport test.
const mocks = vi.hoisted(() => ({
  authenticateCronRequest: vi.fn(),
  syncBatches: vi.fn(),
  startRefresh: vi.fn(),
  sendDailyReport: vi.fn(),
  requireAdmin: vi.fn(),
  isAdmin: vi.fn(),
  consumeTestReportQuota: vi.fn(),
  reportUsers: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }) }));
vi.mock("@/integrations/supabase/cron-auth", () => ({ authenticateCronRequest: mocks.authenticateCronRequest }));
vi.mock("@/lib/server/scraper.server", () => ({
  syncBatches: mocks.syncBatches,
  startRefresh: mocks.startRefresh,
  sendDailyReport: mocks.sendDailyReport,
}));
vi.mock("@/lib/server/admin.server", () => ({ requireAdmin: mocks.requireAdmin, isAdmin: mocks.isAdmin }));
vi.mock("@/lib/server/rate-limit.server", () => ({ consumeTestReportQuota: mocks.consumeTestReportQuota }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ select: () => ({ eq: () => mocks.reportUsers() }) }) },
}));

import { Route as DailyReportRoute } from "@/routes/api/public/jobs/daily-report";
import { Route as RefreshRoute } from "@/routes/api/public/jobs/refresh";

type CronRoute = { options: { server: { handlers: { POST: (ctx: { request: Request }) => Promise<Response> } } } };
const post = (route: unknown) => (route as CronRoute).options.server.handlers.POST;
const request = () => new Request("https://example.test/api/public/jobs/x", { method: "POST" });

function expectNoUserGuardUsed() {
  expect(mocks.requireAdmin).not.toHaveBeenCalled();
  expect(mocks.isAdmin).not.toHaveBeenCalled();
  expect(mocks.consumeTestReportQuota).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("tâche planifiée de relevé des prix", () => {
  it("refuse une requête sans secret valide, sans rien synchroniser ni lancer", async () => {
    mocks.authenticateCronRequest.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    const response = await post(RefreshRoute)({ request: request() });
    expect(response.status).toBe(401);
    expect(mocks.syncBatches).not.toHaveBeenCalled();
    expect(mocks.startRefresh).not.toHaveBeenCalled();
  });

  it("synchronise les lots et lance le relevé à 6 h (heure de Paris)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T05:00:00Z")); // 6 h à Paris en heure d'hiver
    mocks.authenticateCronRequest.mockResolvedValue(null);
    mocks.syncBatches.mockResolvedValue({ ingested: 0, pending: 0 });
    mocks.startRefresh.mockResolvedValue({ started: true, batchId: "b1", urls: 4 });

    const response = await post(RefreshRoute)({ request: request() });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, start: { started: true } });
    expect(mocks.syncBatches).toHaveBeenCalledTimes(1);
    expect(mocks.startRefresh).toHaveBeenCalledWith();
    expectNoUserGuardUsed();
  });

  it("déclenche aussi à 6 h en heure d'été (04 h UTC)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-05T04:00:00Z")); // 6 h à Paris en heure d'été
    mocks.authenticateCronRequest.mockResolvedValue(null);
    mocks.syncBatches.mockResolvedValue({ ingested: 0, pending: 0 });
    mocks.startRefresh.mockResolvedValue({ started: true, batchId: "b2", urls: 4 });

    const response = await post(RefreshRoute)({ request: request() });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, start: { started: true } });
    expect(mocks.startRefresh).toHaveBeenCalledTimes(1);
  });

  it("synchronise les lots mais ne démarre aucun nouveau relevé en dehors de 6 h", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T06:00:00Z")); // 7 h à Paris en heure d'hiver
    mocks.authenticateCronRequest.mockResolvedValue(null);
    mocks.syncBatches.mockResolvedValue({ ingested: 0, pending: 0 });

    const response = await post(RefreshRoute)({ request: request() });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, start: { started: false } });
    expect(mocks.syncBatches).toHaveBeenCalledTimes(1);
    expect(mocks.startRefresh).not.toHaveBeenCalled();
    expectNoUserGuardUsed();
  });
});

describe("tâche planifiée du rapport quotidien", () => {
  it("refuse une requête sans secret valide", async () => {
    mocks.authenticateCronRequest.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    const response = await post(DailyReportRoute)({ request: request() });
    expect(response.status).toBe(401);
    expect(mocks.sendDailyReport).not.toHaveBeenCalled();
  });

  it("envoie le rapport à tous les abonnés à 8 h (Paris), sans limitation ni rôle administrateur", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T07:00:00Z")); // 8 h à Paris en heure d'hiver
    mocks.authenticateCronRequest.mockResolvedValue(null);
    mocks.reportUsers.mockResolvedValue({ data: [{ user_id: "u1" }, { user_id: "u2" }, { user_id: "u3" }] });
    mocks.sendDailyReport.mockResolvedValue(true);

    const response = await post(DailyReportRoute)({ request: request() });

    await expect(response.json()).resolves.toEqual({ success: true, sent: 3 });
    expect(mocks.sendDailyReport).toHaveBeenCalledTimes(3);
    expectNoUserGuardUsed();
  });

  it("envoie aussi le rapport à 8 h en heure d'été (06 h UTC)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-05T06:00:00Z")); // 8 h à Paris en heure d'été
    mocks.authenticateCronRequest.mockResolvedValue(null);
    mocks.reportUsers.mockResolvedValue({ data: [{ user_id: "u1" }] });
    mocks.sendDailyReport.mockResolvedValue(true);

    const response = await post(DailyReportRoute)({ request: request() });

    await expect(response.json()).resolves.toEqual({ success: true, sent: 1 });
  });

  it("n'envoie rien à 7 h (Paris), l'autre exécution quotidienne de la tâche", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T06:00:00Z")); // 7 h à Paris en heure d'hiver
    mocks.authenticateCronRequest.mockResolvedValue(null);

    const response = await post(DailyReportRoute)({ request: request() });

    await expect(response.json()).resolves.toEqual({ success: true, skipped: true });
    expect(mocks.sendDailyReport).not.toHaveBeenCalled();
  });

  it("n'envoie rien en dehors de 8 h (Paris)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T12:00:00Z"));
    mocks.authenticateCronRequest.mockResolvedValue(null);

    const response = await post(DailyReportRoute)({ request: request() });

    await expect(response.json()).resolves.toEqual({ success: true, skipped: true });
    expect(mocks.sendDailyReport).not.toHaveBeenCalled();
  });
});
