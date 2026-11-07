import { GPU_CATALOGUE, type CatalogueGpu } from "./gpu-catalogue";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

const row = (g: CatalogueGpu) =>
  `    (${q(g.name)}, ${q(g.brand)}, ${q(g.searchQuery)}, ${q(g.matchToken)}, ${q(g.series)}, ${q(g.architecture)}, ` +
  `ARRAY[${g.vramGb.join(", ")}]::int[], ${q(g.memoryType)}, ${g.memoryBusBits === null ? "NULL::int" : `${g.memoryBusBits}::int`})`;

/** SQL de la migration 0004, générée depuis GPU_CATALOGUE (voir scripts/generate-catalogue-migration.ts). */
export function buildCatalogueMigrationSql(catalogue: readonly CatalogueGpu[] = GPU_CATALOGUE): string {
  return `-- Catalogue des cartes graphiques de bureau (gaming) : fiche technique + modèles manquants.
-- FICHIER GÉNÉRÉ depuis src/lib/gpu-catalogue.ts par scripts/generate-catalogue-migration.ts : ne pas l'éditer à la main
-- (un test échoue si les deux divergent).
--
-- Additive et idempotente : aucune donnée ni table supprimée, aucune politique RLS modifiée, relançable sans effet.
--  1. Ajoute des colonnes descriptives (toutes facultatives) à public.gpus.
--  2. Pour chaque modèle du catalogue : met à jour la fiche technique de la ligne existante (retrouvée par jeton de
--     reconnaissance, puis par nom) SANS toucher à son nom, sa requête de recherche, son jeton ni ses offres /
--     historiques ; sinon insère le modèle. Aucun doublon n'est créé, même si une ligne a été renommée à la main.
--  3. Pose un index unique sur le jeton de reconnaissance quand les données existantes le permettent.
-- Prérequis : 0000. Exécutée par le propriétaire de la base (SQL Editor / migration), jamais par un utilisateur.

ALTER TABLE public.gpus ADD COLUMN IF NOT EXISTS series text;
ALTER TABLE public.gpus ADD COLUMN IF NOT EXISTS architecture text;
ALTER TABLE public.gpus ADD COLUMN IF NOT EXISTS vram_options int[];
ALTER TABLE public.gpus ADD COLUMN IF NOT EXISTS memory_type text;
ALTER TABLE public.gpus ADD COLUMN IF NOT EXISTS memory_bus_bits int;
ALTER TABLE public.gpus ADD COLUMN IF NOT EXISTS image_url text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gpus_memory_bus_bits_check' AND conrelid = 'public.gpus'::regclass) THEN
    ALTER TABLE public.gpus ADD CONSTRAINT gpus_memory_bus_bits_check CHECK (memory_bus_bits IS NULL OR memory_bus_bits > 0);
  END IF;
END $$;

DO $$
DECLARE
  c record;
  target uuid;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
${catalogue.map(row).join(",\n")}
    ) AS v(name, brand, search_query, match_token, series, architecture, vram_options, memory_type, memory_bus_bits)
  LOOP
    SELECT id INTO target FROM public.gpus WHERE lower(match_token) = lower(c.match_token) ORDER BY created_at LIMIT 1;
    IF target IS NULL THEN
      SELECT id INTO target FROM public.gpus WHERE name = c.name LIMIT 1;
    END IF;

    IF target IS NULL THEN
      INSERT INTO public.gpus (name, brand, search_query, match_token, series, architecture, vram_options, memory_type, memory_bus_bits)
      VALUES (c.name, c.brand, c.search_query, c.match_token, c.series, c.architecture, c.vram_options, c.memory_type, c.memory_bus_bits);
    ELSE
      UPDATE public.gpus
         SET series = c.series, architecture = c.architecture, vram_options = c.vram_options,
             memory_type = c.memory_type, memory_bus_bits = c.memory_bus_bits
       WHERE id = target;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS gpus_match_token_unique ON public.gpus (lower(match_token));
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'gpus_match_token_unique non créé : des jetons existants sont en double (à corriger à la main).';
END $$;

NOTIFY pgrst, 'reload schema';
`;
}
