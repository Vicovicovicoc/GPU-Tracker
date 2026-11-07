import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GPU_CATALOGUE, findCatalogueGpu } from "@/lib/gpu-catalogue";
import { buildCatalogueMigrationSql } from "@/lib/gpu-catalogue-sql";
import { titleMatches } from "@/lib/offer-classifier";

const names = GPU_CATALOGUE.map((g) => g.name);

describe("catalogue des GPU de bureau", () => {
  it("ne contient aucun doublon (nom, jeton, requête)", () => {
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length);
    expect(new Set(GPU_CATALOGUE.map((g) => g.matchToken.toLowerCase())).size).toBe(names.length);
    expect(new Set(GPU_CATALOGUE.map((g) => g.searchQuery.toLowerCase())).size).toBe(names.length);
  });

  it("couvre les générations demandées", () => {
    for (const n of ["RTX 5050", "RTX 5060", "RTX 5060 Ti", "RTX 5070", "RTX 5070 Ti", "RTX 5080", "RTX 5090"]) {
      expect(names).toContain(`GeForce ${n}`);
    }
    for (const series of ["GeForce RTX 50", "GeForce RTX 40", "GeForce RTX 30", "Radeon RX 9000", "Radeon RX 7000", "Radeon RX 6000", "Intel Arc B-Series", "Intel Arc A-Series"]) {
      expect(GPU_CATALOGUE.some((g) => g.series === series)).toBe(true);
    }
  });

  it("conserve les 15 GPU déjà suivis (mêmes noms : pas de doublon à la migration)", () => {
    for (const n of [
      "GeForce RTX 5090", "GeForce RTX 5080", "GeForce RTX 5070 Ti", "GeForce RTX 5070", "GeForce RTX 5060 Ti", "GeForce RTX 5060",
      "GeForce RTX 4060", "GeForce GTX 1650", "Radeon RX 9070 XT", "Radeon RX 9070", "Radeon RX 9060 XT", "Radeon RX 7600",
      "Arc B580", "Arc B570", "Arc A750",
    ]) expect(names).toContain(n);
  });

  it("déclare les variantes mémoire connues", () => {
    expect(findCatalogueGpu({ name: "GeForce RTX 5060 Ti" })?.vramGb).toEqual([8, 16]);
    expect(findCatalogueGpu({ name: "Radeon RX 9060 XT" })?.vramGb).toEqual([8, 16]);
    expect(findCatalogueGpu({ name: "GeForce RTX 4060 Ti" })?.vramGb).toEqual([8, 16]);
    expect(findCatalogueGpu({ name: "GeForce RTX 3060" })?.vramGb).toEqual([8, 12]);
  });

  it("est cohérent : capacités triées, valeurs positives, marque cohérente avec le nom", () => {
    for (const g of GPU_CATALOGUE) {
      expect(g.vramGb.length).toBeGreaterThan(0);
      expect([...g.vramGb].sort((a, b) => a - b)).toEqual(g.vramGb);
      expect(g.memoryBusBits === null || g.memoryBusBits > 0).toBe(true);
      const prefix = { NVIDIA: "GeForce", AMD: "Radeon", Intel: "Arc" }[g.brand];
      expect(g.name.startsWith(prefix)).toBe(true);
    }
  });

  it("chaque GPU est reconnu par son propre nom et pas par un modèle voisin du catalogue", () => {
    for (const g of GPU_CATALOGUE) {
      expect(titleMatches(`Carte graphique ${g.name} 8 Go`, g.matchToken)).toBe(true);
      const others = GPU_CATALOGUE.filter((o) => o !== g && o.brand === g.brand && titleMatches(`${g.name}`, o.matchToken));
      expect(others.map((o) => o.name)).toEqual([]);
    }
  });
});

describe("migration 0004_catalogue_gpu.sql", () => {
  const file = readFileSync(resolve(process.cwd(), "drizzle/migrations/0004_catalogue_gpu.sql"), "utf8");

  it("correspond exactement au catalogue TypeScript (régénérer : bun scripts/generate-catalogue-migration.ts)", () => {
    expect(file).toBe(buildCatalogueMigrationSql());
  });

  it("est additive : aucune suppression de donnée, de table ni de politique", () => {
    expect(file).not.toMatch(/\bDROP\s+(TABLE|POLICY|COLUMN)\b|\bDELETE\s+FROM\b|\bTRUNCATE\b|\bDISABLE ROW LEVEL SECURITY\b/i);
  });

  it("est référencée dans le journal", () => {
    const journal = JSON.parse(readFileSync(resolve(process.cwd(), "drizzle/migrations/meta/_journal.json"), "utf8")) as { entries: { idx: number; tag: string }[] };
    expect(journal.entries.find((e) => e.tag === "0004_catalogue_gpu")?.idx).toBe(4);
  });
});
