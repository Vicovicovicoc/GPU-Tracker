-- Catalogue des cartes graphiques de bureau (gaming) : fiche technique + modèles manquants.
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
    ('GeForce RTX 5090', 'NVIDIA', 'RTX 5090', '5090', 'GeForce RTX 50', 'Blackwell', ARRAY[32]::int[], 'GDDR7', 512::int),
    ('GeForce RTX 5080', 'NVIDIA', 'RTX 5080', '5080', 'GeForce RTX 50', 'Blackwell', ARRAY[16]::int[], 'GDDR7', 256::int),
    ('GeForce RTX 5070 Ti', 'NVIDIA', 'RTX 5070 Ti', '5070 ti', 'GeForce RTX 50', 'Blackwell', ARRAY[16]::int[], 'GDDR7', 256::int),
    ('GeForce RTX 5070', 'NVIDIA', 'RTX 5070', '5070', 'GeForce RTX 50', 'Blackwell', ARRAY[12]::int[], 'GDDR7', 192::int),
    ('GeForce RTX 5060 Ti', 'NVIDIA', 'RTX 5060 Ti', '5060 ti', 'GeForce RTX 50', 'Blackwell', ARRAY[8, 16]::int[], 'GDDR7', 128::int),
    ('GeForce RTX 5060', 'NVIDIA', 'RTX 5060', '5060', 'GeForce RTX 50', 'Blackwell', ARRAY[8]::int[], 'GDDR7', 128::int),
    ('GeForce RTX 5050', 'NVIDIA', 'RTX 5050', '5050', 'GeForce RTX 50', 'Blackwell', ARRAY[8]::int[], 'GDDR6', 128::int),
    ('GeForce RTX 4090', 'NVIDIA', 'RTX 4090', '4090', 'GeForce RTX 40', 'Ada Lovelace', ARRAY[24]::int[], 'GDDR6X', 384::int),
    ('GeForce RTX 4080 Super', 'NVIDIA', 'RTX 4080 Super', '4080 super', 'GeForce RTX 40', 'Ada Lovelace', ARRAY[16]::int[], 'GDDR6X', 256::int),
    ('GeForce RTX 4080', 'NVIDIA', 'RTX 4080', '4080', 'GeForce RTX 40', 'Ada Lovelace', ARRAY[16]::int[], 'GDDR6X', 256::int),
    ('GeForce RTX 4070 Ti Super', 'NVIDIA', 'RTX 4070 Ti Super', '4070 ti super', 'GeForce RTX 40', 'Ada Lovelace', ARRAY[16]::int[], 'GDDR6X', 256::int),
    ('GeForce RTX 4070 Ti', 'NVIDIA', 'RTX 4070 Ti', '4070 ti', 'GeForce RTX 40', 'Ada Lovelace', ARRAY[12]::int[], 'GDDR6X', 192::int),
    ('GeForce RTX 4070 Super', 'NVIDIA', 'RTX 4070 Super', '4070 super', 'GeForce RTX 40', 'Ada Lovelace', ARRAY[12]::int[], 'GDDR6X', 192::int),
    ('GeForce RTX 4070', 'NVIDIA', 'RTX 4070', '4070', 'GeForce RTX 40', 'Ada Lovelace', ARRAY[12]::int[], 'GDDR6X (révision GDDR6 existante)', 192::int),
    ('GeForce RTX 4060 Ti', 'NVIDIA', 'RTX 4060 Ti', '4060 ti', 'GeForce RTX 40', 'Ada Lovelace', ARRAY[8, 16]::int[], 'GDDR6', 128::int),
    ('GeForce RTX 4060', 'NVIDIA', 'RTX 4060', '4060', 'GeForce RTX 40', 'Ada Lovelace', ARRAY[8]::int[], 'GDDR6', 128::int),
    ('GeForce RTX 3090 Ti', 'NVIDIA', 'RTX 3090 Ti', '3090 ti', 'GeForce RTX 30', 'Ampere', ARRAY[24]::int[], 'GDDR6X', 384::int),
    ('GeForce RTX 3090', 'NVIDIA', 'RTX 3090', '3090', 'GeForce RTX 30', 'Ampere', ARRAY[24]::int[], 'GDDR6X', 384::int),
    ('GeForce RTX 3080 Ti', 'NVIDIA', 'RTX 3080 Ti', '3080 ti', 'GeForce RTX 30', 'Ampere', ARRAY[12]::int[], 'GDDR6X', 384::int),
    ('GeForce RTX 3080', 'NVIDIA', 'RTX 3080', '3080', 'GeForce RTX 30', 'Ampere', ARRAY[10, 12]::int[], 'GDDR6X', NULL::int),
    ('GeForce RTX 3070 Ti', 'NVIDIA', 'RTX 3070 Ti', '3070 ti', 'GeForce RTX 30', 'Ampere', ARRAY[8]::int[], 'GDDR6X', 256::int),
    ('GeForce RTX 3070', 'NVIDIA', 'RTX 3070', '3070', 'GeForce RTX 30', 'Ampere', ARRAY[8]::int[], 'GDDR6', 256::int),
    ('GeForce RTX 3060 Ti', 'NVIDIA', 'RTX 3060 Ti', '3060 ti', 'GeForce RTX 30', 'Ampere', ARRAY[8]::int[], 'GDDR6 (variante GDDR6X existante)', 256::int),
    ('GeForce RTX 3060', 'NVIDIA', 'RTX 3060', '3060', 'GeForce RTX 30', 'Ampere', ARRAY[8, 12]::int[], 'GDDR6', NULL::int),
    ('GeForce RTX 3050', 'NVIDIA', 'RTX 3050', '3050', 'GeForce RTX 30', 'Ampere', ARRAY[6, 8]::int[], 'GDDR6', NULL::int),
    ('GeForce GTX 1650', 'NVIDIA', 'GTX 1650', '1650', 'GeForce GTX 16', 'Turing', ARRAY[4]::int[], 'GDDR5 (variantes GDDR6 existantes)', 128::int),
    ('Radeon RX 9070 XT', 'AMD', 'RX 9070 XT', '9070 xt', 'Radeon RX 9000', 'RDNA 4', ARRAY[16]::int[], 'GDDR6', 256::int),
    ('Radeon RX 9070', 'AMD', 'RX 9070', '9070', 'Radeon RX 9000', 'RDNA 4', ARRAY[16]::int[], 'GDDR6', 256::int),
    ('Radeon RX 9060 XT', 'AMD', 'RX 9060 XT', '9060 xt', 'Radeon RX 9000', 'RDNA 4', ARRAY[8, 16]::int[], 'GDDR6', 128::int),
    ('Radeon RX 7900 XTX', 'AMD', 'RX 7900 XTX', '7900 xtx', 'Radeon RX 7000', 'RDNA 3', ARRAY[24]::int[], 'GDDR6', 384::int),
    ('Radeon RX 7900 XT', 'AMD', 'RX 7900 XT', '7900 xt', 'Radeon RX 7000', 'RDNA 3', ARRAY[20]::int[], 'GDDR6', 320::int),
    ('Radeon RX 7900 GRE', 'AMD', 'RX 7900 GRE', '7900 gre', 'Radeon RX 7000', 'RDNA 3', ARRAY[16]::int[], 'GDDR6', 256::int),
    ('Radeon RX 7800 XT', 'AMD', 'RX 7800 XT', '7800 xt', 'Radeon RX 7000', 'RDNA 3', ARRAY[16]::int[], 'GDDR6', 256::int),
    ('Radeon RX 7700 XT', 'AMD', 'RX 7700 XT', '7700 xt', 'Radeon RX 7000', 'RDNA 3', ARRAY[12]::int[], 'GDDR6', 192::int),
    ('Radeon RX 7600 XT', 'AMD', 'RX 7600 XT', '7600 xt', 'Radeon RX 7000', 'RDNA 3', ARRAY[16]::int[], 'GDDR6', 128::int),
    ('Radeon RX 7600', 'AMD', 'RX 7600', '7600', 'Radeon RX 7000', 'RDNA 3', ARRAY[8]::int[], 'GDDR6', 128::int),
    ('Radeon RX 6950 XT', 'AMD', 'RX 6950 XT', '6950 xt', 'Radeon RX 6000', 'RDNA 2', ARRAY[16]::int[], 'GDDR6', 256::int),
    ('Radeon RX 6900 XT', 'AMD', 'RX 6900 XT', '6900 xt', 'Radeon RX 6000', 'RDNA 2', ARRAY[16]::int[], 'GDDR6', 256::int),
    ('Radeon RX 6800 XT', 'AMD', 'RX 6800 XT', '6800 xt', 'Radeon RX 6000', 'RDNA 2', ARRAY[16]::int[], 'GDDR6', 256::int),
    ('Radeon RX 6800', 'AMD', 'RX 6800', '6800', 'Radeon RX 6000', 'RDNA 2', ARRAY[16]::int[], 'GDDR6', 256::int),
    ('Radeon RX 6750 XT', 'AMD', 'RX 6750 XT', '6750 xt', 'Radeon RX 6000', 'RDNA 2', ARRAY[12]::int[], 'GDDR6', 192::int),
    ('Radeon RX 6700 XT', 'AMD', 'RX 6700 XT', '6700 xt', 'Radeon RX 6000', 'RDNA 2', ARRAY[12]::int[], 'GDDR6', 192::int),
    ('Radeon RX 6700', 'AMD', 'RX 6700', '6700', 'Radeon RX 6000', 'RDNA 2', ARRAY[10]::int[], 'GDDR6', 160::int),
    ('Radeon RX 6650 XT', 'AMD', 'RX 6650 XT', '6650 xt', 'Radeon RX 6000', 'RDNA 2', ARRAY[8]::int[], 'GDDR6', 128::int),
    ('Radeon RX 6600 XT', 'AMD', 'RX 6600 XT', '6600 xt', 'Radeon RX 6000', 'RDNA 2', ARRAY[8]::int[], 'GDDR6', 128::int),
    ('Radeon RX 6600', 'AMD', 'RX 6600', '6600', 'Radeon RX 6000', 'RDNA 2', ARRAY[8]::int[], 'GDDR6', 128::int),
    ('Radeon RX 6500 XT', 'AMD', 'RX 6500 XT', '6500 xt', 'Radeon RX 6000', 'RDNA 2', ARRAY[4, 8]::int[], 'GDDR6', 64::int),
    ('Radeon RX 6400', 'AMD', 'RX 6400', '6400', 'Radeon RX 6000', 'RDNA 2', ARRAY[4]::int[], 'GDDR6', 64::int),
    ('Arc B580', 'Intel', 'Arc B580', 'b580', 'Intel Arc B-Series', 'Battlemage (Xe2)', ARRAY[12]::int[], 'GDDR6', 192::int),
    ('Arc B570', 'Intel', 'Arc B570', 'b570', 'Intel Arc B-Series', 'Battlemage (Xe2)', ARRAY[10]::int[], 'GDDR6', 160::int),
    ('Arc A770', 'Intel', 'Arc A770', 'a770', 'Intel Arc A-Series', 'Alchemist (Xe-HPG)', ARRAY[8, 16]::int[], 'GDDR6', 256::int),
    ('Arc A750', 'Intel', 'Arc A750', 'a750', 'Intel Arc A-Series', 'Alchemist (Xe-HPG)', ARRAY[8]::int[], 'GDDR6', 256::int),
    ('Arc A580', 'Intel', 'Arc A580', 'a580', 'Intel Arc A-Series', 'Alchemist (Xe-HPG)', ARRAY[8]::int[], 'GDDR6', 256::int),
    ('Arc A380', 'Intel', 'Arc A380', 'a380', 'Intel Arc A-Series', 'Alchemist (Xe-HPG)', ARRAY[6]::int[], 'GDDR6', 96::int),
    ('Arc A310', 'Intel', 'Arc A310', 'a310', 'Intel Arc A-Series', 'Alchemist (Xe-HPG)', ARRAY[4]::int[], 'GDDR6', 64::int)
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
