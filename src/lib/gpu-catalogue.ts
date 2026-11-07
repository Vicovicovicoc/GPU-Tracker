// Catalogue des cartes graphiques de bureau (gaming) suivies.
//
// Source de vérité unique : la migration drizzle/migrations/0004_catalogue_gpu.sql en est GÉNÉRÉE
// (scripts/generate-catalogue-migration.ts) et un test vérifie qu'elles ne divergent pas.
//
// Règles :
//  - une ligne par modèle de GPU (puce + déclinaison commerciale), jamais par fabricant de carte
//    (ASUS, MSI, Sapphire… sont des versions « AIB » du même modèle : elles apparaissent comme des offres) ;
//  - les capacités de mémoire déclinées d'un même modèle (8 / 16 Go…) sont des options (`vramGb`), pas des doublons ;
//  - seules des caractéristiques officielles connues sont renseignées ; ce qui varie selon la version ou qui
//    est incertain est laissé à `null` plutôt qu'inventé ;
//  - les cartes pour portables, les modèles professionnels et les modèles non commercialisés en France sont exclus.

export type GpuBrand = "NVIDIA" | "AMD" | "Intel";

export interface CatalogueGpu {
  /** Nom complet — clé d'unicité (gpus.name). */
  name: string;
  /** Fabricant de la puce. */
  brand: GpuBrand;
  /** Gamme. */
  series: string;
  architecture: string;
  /** Capacités mémoire existantes pour ce modèle, en Go, ordre croissant. */
  vramGb: number[];
  memoryType: string;
  /** Largeur du bus mémoire en bits ; null quand elle varie selon la déclinaison. */
  memoryBusBits: number | null;
  /** Requête envoyée aux boutiques. */
  searchQuery: string;
  /** Jeton de reconnaissance dans les titres (voir titleMatches). Unique dans le catalogue. */
  matchToken: string;
}

type Spec = Omit<CatalogueGpu, "name" | "brand" | "searchQuery" | "matchToken">;
const nv = (name: string, query: string, token: string, s: Spec): CatalogueGpu => ({ name, brand: "NVIDIA", searchQuery: query, matchToken: token, ...s });
const amd = (name: string, query: string, token: string, s: Spec): CatalogueGpu => ({ name, brand: "AMD", searchQuery: query, matchToken: token, ...s });
const intel = (name: string, query: string, token: string, s: Spec): CatalogueGpu => ({ name, brand: "Intel", searchQuery: query, matchToken: token, ...s });

const RTX50 = { series: "GeForce RTX 50", architecture: "Blackwell" };
const RTX40 = { series: "GeForce RTX 40", architecture: "Ada Lovelace" };
const RTX30 = { series: "GeForce RTX 30", architecture: "Ampere" };
const RX9 = { series: "Radeon RX 9000", architecture: "RDNA 4" };
const RX7 = { series: "Radeon RX 7000", architecture: "RDNA 3" };
const RX6 = { series: "Radeon RX 6000", architecture: "RDNA 2" };
const ARCB = { series: "Intel Arc B-Series", architecture: "Battlemage (Xe2)" };
const ARCA = { series: "Intel Arc A-Series", architecture: "Alchemist (Xe-HPG)" };

export const GPU_CATALOGUE: readonly CatalogueGpu[] = [
  // ── NVIDIA GeForce RTX 50 ───────────────────────────────────────────────
  nv("GeForce RTX 5090", "RTX 5090", "5090", { ...RTX50, vramGb: [32], memoryType: "GDDR7", memoryBusBits: 512 }),
  nv("GeForce RTX 5080", "RTX 5080", "5080", { ...RTX50, vramGb: [16], memoryType: "GDDR7", memoryBusBits: 256 }),
  nv("GeForce RTX 5070 Ti", "RTX 5070 Ti", "5070 ti", { ...RTX50, vramGb: [16], memoryType: "GDDR7", memoryBusBits: 256 }),
  nv("GeForce RTX 5070", "RTX 5070", "5070", { ...RTX50, vramGb: [12], memoryType: "GDDR7", memoryBusBits: 192 }),
  nv("GeForce RTX 5060 Ti", "RTX 5060 Ti", "5060 ti", { ...RTX50, vramGb: [8, 16], memoryType: "GDDR7", memoryBusBits: 128 }),
  nv("GeForce RTX 5060", "RTX 5060", "5060", { ...RTX50, vramGb: [8], memoryType: "GDDR7", memoryBusBits: 128 }),
  nv("GeForce RTX 5050", "RTX 5050", "5050", { ...RTX50, vramGb: [8], memoryType: "GDDR6", memoryBusBits: 128 }),

  // ── NVIDIA GeForce RTX 40 ───────────────────────────────────────────────
  nv("GeForce RTX 4090", "RTX 4090", "4090", { ...RTX40, vramGb: [24], memoryType: "GDDR6X", memoryBusBits: 384 }),
  nv("GeForce RTX 4080 Super", "RTX 4080 Super", "4080 super", { ...RTX40, vramGb: [16], memoryType: "GDDR6X", memoryBusBits: 256 }),
  nv("GeForce RTX 4080", "RTX 4080", "4080", { ...RTX40, vramGb: [16], memoryType: "GDDR6X", memoryBusBits: 256 }),
  nv("GeForce RTX 4070 Ti Super", "RTX 4070 Ti Super", "4070 ti super", { ...RTX40, vramGb: [16], memoryType: "GDDR6X", memoryBusBits: 256 }),
  nv("GeForce RTX 4070 Ti", "RTX 4070 Ti", "4070 ti", { ...RTX40, vramGb: [12], memoryType: "GDDR6X", memoryBusBits: 192 }),
  nv("GeForce RTX 4070 Super", "RTX 4070 Super", "4070 super", { ...RTX40, vramGb: [12], memoryType: "GDDR6X", memoryBusBits: 192 }),
  nv("GeForce RTX 4070", "RTX 4070", "4070", { ...RTX40, vramGb: [12], memoryType: "GDDR6X (révision GDDR6 existante)", memoryBusBits: 192 }),
  nv("GeForce RTX 4060 Ti", "RTX 4060 Ti", "4060 ti", { ...RTX40, vramGb: [8, 16], memoryType: "GDDR6", memoryBusBits: 128 }),
  nv("GeForce RTX 4060", "RTX 4060", "4060", { ...RTX40, vramGb: [8], memoryType: "GDDR6", memoryBusBits: 128 }),

  // ── NVIDIA GeForce RTX 30 ───────────────────────────────────────────────
  nv("GeForce RTX 3090 Ti", "RTX 3090 Ti", "3090 ti", { ...RTX30, vramGb: [24], memoryType: "GDDR6X", memoryBusBits: 384 }),
  nv("GeForce RTX 3090", "RTX 3090", "3090", { ...RTX30, vramGb: [24], memoryType: "GDDR6X", memoryBusBits: 384 }),
  nv("GeForce RTX 3080 Ti", "RTX 3080 Ti", "3080 ti", { ...RTX30, vramGb: [12], memoryType: "GDDR6X", memoryBusBits: 384 }),
  nv("GeForce RTX 3080", "RTX 3080", "3080", { ...RTX30, vramGb: [10, 12], memoryType: "GDDR6X", memoryBusBits: null }),
  nv("GeForce RTX 3070 Ti", "RTX 3070 Ti", "3070 ti", { ...RTX30, vramGb: [8], memoryType: "GDDR6X", memoryBusBits: 256 }),
  nv("GeForce RTX 3070", "RTX 3070", "3070", { ...RTX30, vramGb: [8], memoryType: "GDDR6", memoryBusBits: 256 }),
  nv("GeForce RTX 3060 Ti", "RTX 3060 Ti", "3060 ti", { ...RTX30, vramGb: [8], memoryType: "GDDR6 (variante GDDR6X existante)", memoryBusBits: 256 }),
  nv("GeForce RTX 3060", "RTX 3060", "3060", { ...RTX30, vramGb: [8, 12], memoryType: "GDDR6", memoryBusBits: null }),
  nv("GeForce RTX 3050", "RTX 3050", "3050", { ...RTX30, vramGb: [6, 8], memoryType: "GDDR6", memoryBusBits: null }),

  // ── NVIDIA GeForce GTX 16 (déjà suivie avant l'ajout du catalogue : conservée) ─────────────
  nv("GeForce GTX 1650", "GTX 1650", "1650", { series: "GeForce GTX 16", architecture: "Turing", vramGb: [4], memoryType: "GDDR5 (variantes GDDR6 existantes)", memoryBusBits: 128 }),

  // ── AMD Radeon RX 9000 ──────────────────────────────────────────────────
  amd("Radeon RX 9070 XT", "RX 9070 XT", "9070 xt", { ...RX9, vramGb: [16], memoryType: "GDDR6", memoryBusBits: 256 }),
  amd("Radeon RX 9070", "RX 9070", "9070", { ...RX9, vramGb: [16], memoryType: "GDDR6", memoryBusBits: 256 }),
  amd("Radeon RX 9060 XT", "RX 9060 XT", "9060 xt", { ...RX9, vramGb: [8, 16], memoryType: "GDDR6", memoryBusBits: 128 }),

  // ── AMD Radeon RX 7000 ──────────────────────────────────────────────────
  amd("Radeon RX 7900 XTX", "RX 7900 XTX", "7900 xtx", { ...RX7, vramGb: [24], memoryType: "GDDR6", memoryBusBits: 384 }),
  amd("Radeon RX 7900 XT", "RX 7900 XT", "7900 xt", { ...RX7, vramGb: [20], memoryType: "GDDR6", memoryBusBits: 320 }),
  amd("Radeon RX 7900 GRE", "RX 7900 GRE", "7900 gre", { ...RX7, vramGb: [16], memoryType: "GDDR6", memoryBusBits: 256 }),
  amd("Radeon RX 7800 XT", "RX 7800 XT", "7800 xt", { ...RX7, vramGb: [16], memoryType: "GDDR6", memoryBusBits: 256 }),
  amd("Radeon RX 7700 XT", "RX 7700 XT", "7700 xt", { ...RX7, vramGb: [12], memoryType: "GDDR6", memoryBusBits: 192 }),
  amd("Radeon RX 7600 XT", "RX 7600 XT", "7600 xt", { ...RX7, vramGb: [16], memoryType: "GDDR6", memoryBusBits: 128 }),
  amd("Radeon RX 7600", "RX 7600", "7600", { ...RX7, vramGb: [8], memoryType: "GDDR6", memoryBusBits: 128 }),

  // ── AMD Radeon RX 6000 ──────────────────────────────────────────────────
  amd("Radeon RX 6950 XT", "RX 6950 XT", "6950 xt", { ...RX6, vramGb: [16], memoryType: "GDDR6", memoryBusBits: 256 }),
  amd("Radeon RX 6900 XT", "RX 6900 XT", "6900 xt", { ...RX6, vramGb: [16], memoryType: "GDDR6", memoryBusBits: 256 }),
  amd("Radeon RX 6800 XT", "RX 6800 XT", "6800 xt", { ...RX6, vramGb: [16], memoryType: "GDDR6", memoryBusBits: 256 }),
  amd("Radeon RX 6800", "RX 6800", "6800", { ...RX6, vramGb: [16], memoryType: "GDDR6", memoryBusBits: 256 }),
  amd("Radeon RX 6750 XT", "RX 6750 XT", "6750 xt", { ...RX6, vramGb: [12], memoryType: "GDDR6", memoryBusBits: 192 }),
  amd("Radeon RX 6700 XT", "RX 6700 XT", "6700 xt", { ...RX6, vramGb: [12], memoryType: "GDDR6", memoryBusBits: 192 }),
  amd("Radeon RX 6700", "RX 6700", "6700", { ...RX6, vramGb: [10], memoryType: "GDDR6", memoryBusBits: 160 }),
  amd("Radeon RX 6650 XT", "RX 6650 XT", "6650 xt", { ...RX6, vramGb: [8], memoryType: "GDDR6", memoryBusBits: 128 }),
  amd("Radeon RX 6600 XT", "RX 6600 XT", "6600 xt", { ...RX6, vramGb: [8], memoryType: "GDDR6", memoryBusBits: 128 }),
  amd("Radeon RX 6600", "RX 6600", "6600", { ...RX6, vramGb: [8], memoryType: "GDDR6", memoryBusBits: 128 }),
  amd("Radeon RX 6500 XT", "RX 6500 XT", "6500 xt", { ...RX6, vramGb: [4, 8], memoryType: "GDDR6", memoryBusBits: 64 }),
  amd("Radeon RX 6400", "RX 6400", "6400", { ...RX6, vramGb: [4], memoryType: "GDDR6", memoryBusBits: 64 }),

  // ── Intel Arc B-Series ──────────────────────────────────────────────────
  intel("Arc B580", "Arc B580", "b580", { ...ARCB, vramGb: [12], memoryType: "GDDR6", memoryBusBits: 192 }),
  intel("Arc B570", "Arc B570", "b570", { ...ARCB, vramGb: [10], memoryType: "GDDR6", memoryBusBits: 160 }),

  // ── Intel Arc A-Series ──────────────────────────────────────────────────
  intel("Arc A770", "Arc A770", "a770", { ...ARCA, vramGb: [8, 16], memoryType: "GDDR6", memoryBusBits: 256 }),
  intel("Arc A750", "Arc A750", "a750", { ...ARCA, vramGb: [8], memoryType: "GDDR6", memoryBusBits: 256 }),
  intel("Arc A580", "Arc A580", "a580", { ...ARCA, vramGb: [8], memoryType: "GDDR6", memoryBusBits: 256 }),
  intel("Arc A380", "Arc A380", "a380", { ...ARCA, vramGb: [6], memoryType: "GDDR6", memoryBusBits: 96 }),
  intel("Arc A310", "Arc A310", "a310", { ...ARCA, vramGb: [4], memoryType: "GDDR6", memoryBusBits: 64 }),
];

const byName = new Map(GPU_CATALOGUE.map((g) => [g.name.toLowerCase(), g]));
const byToken = new Map(GPU_CATALOGUE.map((g) => [g.matchToken.toLowerCase(), g]));

/** Fiche du catalogue correspondant à une ligne de la table gpus (par nom, puis par jeton). */
export function findCatalogueGpu(gpu: { name: string; match_token?: string | null }): CatalogueGpu | undefined {
  return byName.get(gpu.name.toLowerCase()) ?? (gpu.match_token ? byToken.get(gpu.match_token.toLowerCase()) : undefined);
}
