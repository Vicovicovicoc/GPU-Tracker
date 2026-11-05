import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Garde-fous de lecture sur la migration 0003 : ils empêchent de retirer par inadvertance une restriction
// d'accès. Le comportement réel (fuite de has_role, droits, limitation, concurrence) a été vérifié
// contre un PostgreSQL 16 avec les rôles anon / authenticated / service_role, pas seulement lu.
const read = (file: string) => readFileSync(resolve(process.cwd(), "drizzle/migrations", file), "utf8");
const sql = read("0003_audit_securite.sql");

describe("migration 0003 — has_role", () => {
  it("ne répond que pour l'utilisateur connecté (ou la clé de service)", () => {
    expect(sql).toMatch(/_user_id = auth\.uid\(\)/);
    expect(sql).toMatch(/'service_role'/);
  });

  it("reste exécutable par les utilisateurs connectés (nécessaire à la politique d'ajout de GPU) mais pas par anon", () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.has_role\(uuid, public\.app_role\) FROM PUBLIC, anon;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.has_role\(uuid, public\.app_role\) TO authenticated, service_role;/);
  });
});

describe("migration 0003 — user_roles", () => {
  it("retire toute écriture aux utilisateurs connectés et tout accès à anon", () => {
    expect(sql).toMatch(/REVOKE ALL ON public\.user_roles FROM anon;/);
    expect(sql).toMatch(/REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public\.user_roles FROM authenticated;/);
  });
});

describe("migration 0003 — limitation de débit", () => {
  it("active la RLS et ferme la table à anon et authenticated", () => {
    expect(sql).toMatch(/ALTER TABLE public\.rate_limits ENABLE ROW LEVEL SECURITY;/);
    expect(sql).toMatch(/REVOKE ALL ON public\.rate_limits FROM PUBLIC, anon, authenticated;/);
    expect(sql).not.toMatch(/CREATE POLICY[^;]*rate_limits/);
  });

  it("réserve consume_rate_limit à la clé de service", () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.consume_rate_limit\(uuid, text, int, int\) FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.consume_rate_limit\(uuid, text, int, int\) TO service_role;/);
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.consume_rate_limit[^;]*(authenticated|anon)/);
  });

  it("supprime les compteurs avec le compte utilisateur", () => {
    expect(sql).toMatch(/REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  });
});

describe("journal des migrations", () => {
  it("référence la migration 0003", () => {
    const journal = JSON.parse(read("meta/_journal.json")) as { entries: { idx: number; tag: string }[] };
    expect(journal.entries.at(-1)).toMatchObject({ idx: 3, tag: "0003_audit_securite" });
  });
});
