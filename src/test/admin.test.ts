import { afterEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client.server", () => {
  type Builder = { select: () => Builder; eq: () => Builder; maybeSingle: typeof maybeSingle };
  const builder: Builder = { select: () => builder, eq: () => builder, maybeSingle };
  return { supabaseAdmin: { from: () => builder } };
});

import { isAdmin, requireAdmin } from "@/lib/server/admin.server";

afterEach(() => {
  maybeSingle.mockReset();
  vi.restoreAllMocks();
});

describe("isAdmin", () => {
  it("retourne true quand l'utilisateur a le rôle admin", async () => {
    maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
    await expect(isAdmin("user-1")).resolves.toBe(true);
  });

  it("retourne false quand l'utilisateur n'a aucun rôle", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(isAdmin("user-1")).resolves.toBe(false);
  });

  it("refuse l'accès quand la lecture échoue (par exemple migration non appliquée)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    maybeSingle.mockResolvedValue({ data: null, error: { message: "relation user_roles does not exist" } });
    await expect(isAdmin("user-1")).resolves.toBe(false);
  });
});

describe("requireAdmin", () => {
  it("laisse passer un administrateur", async () => {
    maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
    await expect(requireAdmin("user-1")).resolves.toBeUndefined();
  });

  it("lève une erreur pour un utilisateur ordinaire", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(requireAdmin("user-1")).rejects.toThrow(/réservée aux administrateurs/);
  });
});
