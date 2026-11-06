import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  startRefresh: vi.fn(),
  syncBatches: vi.fn(),
  sendDailyReport: vi.fn(),
  consumeTestReportQuota: vi.fn(),
}));

// createServerFn est remplacé par une chaîne qui renvoie directement la fonction « handler » :
// on teste ainsi le vrai code de gpu.functions.ts (contrôles d'accès compris), sans serveur.
vi.mock("@tanstack/react-start", () => {
  const chain = { middleware: () => chain, handler: (fn: unknown) => fn };
  return { createServerFn: () => chain };
});
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/server/admin.server", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/server/scraper.server", () => ({
  startRefresh: mocks.startRefresh,
  syncBatches: mocks.syncBatches,
  sendDailyReport: mocks.sendDailyReport,
}));
vi.mock("@/lib/server/rate-limit.server", () => ({ consumeTestReportQuota: mocks.consumeTestReportQuota }));

import { sendTestReport, syncRefresh, triggerRefresh } from "@/lib/gpu.functions";

type Handler = (args: { context: { userId: string } }) => Promise<unknown>;
const run = (fn: unknown) => (fn as Handler)({ context: { userId: "user-1" } });
const notAdmin = () => new Error("Action réservée aux administrateurs.");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("syncRefresh", () => {
  it("refuse un utilisateur qui n'est pas administrateur, sans rien synchroniser", async () => {
    mocks.requireAdmin.mockRejectedValue(notAdmin());
    await expect(run(syncRefresh)).rejects.toThrow(/réservée aux administrateurs/);
    expect(mocks.requireAdmin).toHaveBeenCalledWith("user-1");
    expect(mocks.syncBatches).not.toHaveBeenCalled();
  });

  it("lance la synchronisation pour un administrateur", async () => {
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.syncBatches.mockResolvedValue({ ingested: 1, pending: 0 });
    await expect(run(syncRefresh)).resolves.toEqual({ ingested: 1, pending: 0 });
    expect(mocks.requireAdmin).toHaveBeenCalledWith("user-1");
    expect(mocks.syncBatches).toHaveBeenCalledTimes(1);
  });
});

describe("triggerRefresh", () => {
  it("refuse un utilisateur qui n'est pas administrateur, sans lancer de relevé", async () => {
    mocks.requireAdmin.mockRejectedValue(notAdmin());
    await expect(run(triggerRefresh)).rejects.toThrow(/réservée aux administrateurs/);
    expect(mocks.startRefresh).not.toHaveBeenCalled();
  });

  it("lance un relevé forcé pour un administrateur", async () => {
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.startRefresh.mockResolvedValue({ started: true, batchId: "b1", urls: 3 });
    await expect(run(triggerRefresh)).resolves.toMatchObject({ started: true });
    expect(mocks.startRefresh).toHaveBeenCalledWith({ force: true });
  });
});

describe("sendTestReport", () => {
  it.each(["burst", "daily", "unavailable"] as const)(
    "n'envoie rien et signale la limite quand la limitation répond « %s »",
    async (reason) => {
      mocks.consumeTestReportQuota.mockResolvedValue({ allowed: false, reason });
      await expect(run(sendTestReport)).resolves.toEqual({ sent: false, limited: reason });
      expect(mocks.sendDailyReport).not.toHaveBeenCalled();
    },
  );

  it("envoie le rapport à l'utilisateur connecté tant que la limite n'est pas atteinte", async () => {
    mocks.consumeTestReportQuota.mockResolvedValue({ allowed: true });
    mocks.sendDailyReport.mockResolvedValue(true);
    await expect(run(sendTestReport)).resolves.toEqual({ sent: true, limited: null });
    expect(mocks.consumeTestReportQuota).toHaveBeenCalledWith("user-1");
    expect(mocks.sendDailyReport).toHaveBeenCalledWith("user-1");
  });

  it("indique qu'il n'y a rien à envoyer quand il n'y a pas encore de prix", async () => {
    mocks.consumeTestReportQuota.mockResolvedValue({ allowed: true });
    mocks.sendDailyReport.mockResolvedValue(false);
    await expect(run(sendTestReport)).resolves.toEqual({ sent: false, limited: null });
  });

  it("reste accessible à un utilisateur ordinaire (aucun rôle administrateur exigé)", async () => {
    mocks.requireAdmin.mockRejectedValue(notAdmin());
    mocks.consumeTestReportQuota.mockResolvedValue({ allowed: true });
    mocks.sendDailyReport.mockResolvedValue(true);
    await expect(run(sendTestReport)).resolves.toEqual({ sent: true, limited: null });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });
});
