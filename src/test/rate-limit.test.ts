import { afterEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc } }));

import { TEST_REPORT_LIMITS, consumeTestReportQuota } from "@/lib/server/rate-limit.server";

afterEach(() => {
  rpc.mockReset();
  vi.restoreAllMocks();
});

describe("limites du rapport test", () => {
  it("autorise 1 envoi par minute et 5 par 24 h", () => {
    expect(TEST_REPORT_LIMITS.burst).toMatchObject({ max: 1, windowSeconds: 60 });
    expect(TEST_REPORT_LIMITS.daily).toMatchObject({ max: 5, windowSeconds: 86400 });
  });
});

describe("consumeTestReportQuota", () => {
  it("autorise l'envoi quand les deux compteurs l'acceptent, et les décompte pour l'utilisateur", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(consumeTestReportQuota("user-1")).resolves.toEqual({ allowed: true });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, "consume_rate_limit", {
      _user_id: "user-1",
      _action: "test_report_burst",
      _max_count: 1,
      _window_seconds: 60,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "consume_rate_limit", {
      _user_id: "user-1",
      _action: "test_report_daily",
      _max_count: 5,
      _window_seconds: 86400,
    });
  });

  it("refuse un envoi répété à moins d'une minute, sans entamer le quota journalier", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(consumeTestReportQuota("user-1")).resolves.toEqual({ allowed: false, reason: "burst" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("refuse quand le quota journalier est atteint", async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });
    await expect(consumeTestReportQuota("user-1")).resolves.toEqual({ allowed: false, reason: "daily" });
  });

  it("refuse par prudence quand la base renvoie autre chose que true", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(consumeTestReportQuota("user-1")).resolves.toEqual({ allowed: false, reason: "burst" });
  });

  it("refuse par prudence quand la limitation est indisponible (ex. migration non appliquée)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: "function consume_rate_limit does not exist" } });
    await expect(consumeTestReportQuota("user-1")).resolves.toEqual({ allowed: false, reason: "unavailable" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("refuse aussi quand seul le second compteur est indisponible", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(consumeTestReportQuota("user-1")).resolves.toEqual({ allowed: false, reason: "unavailable" });
  });
});
