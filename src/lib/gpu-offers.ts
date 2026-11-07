import { isDesktopGpuOffer, normalizeTitle } from "./offer-classifier";
import { findCatalogueGpu } from "./gpu-catalogue";
import { STORES } from "./stores";

export interface GpuLike {
  id: string;
  name: string;
  brand: string;
  match_token: string;
  series?: string | null;
  architecture?: string | null;
  vram_options?: number[] | null;
  memory_type?: string | null;
  memory_bus_bits?: number | null;
  image_url?: string | null;
}

export interface OfferLike {
  id: string;
  title: string;
  store: string;
  url: string;
  price: number;
  old_price: number | null;
  in_stock: boolean;
  last_checked_at: string;
  gpu_id: string;
}

/** Le lien appartient-il bien au site de la boutique de l'offre (https, bon domaine) ? */
export function hasValidMerchantUrl(offer: { store: string; url: string }): boolean {
  const store = STORES.find((s) => s.id === offer.store);
  if (!store) return false;
  try {
    const link = new URL(offer.url);
    const host = new URL(store.origin).hostname.replace(/^www\./, "");
    return link.protocol === "https:" && (link.hostname === host || link.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

/** Réduction affichable : l'ancien prix doit être supérieur, et pas absurdement (> 3× le prix : relevé erroné). */
export function isPlausiblePromo(price: number, oldPrice: number | null): boolean {
  return oldPrice != null && oldPrice > price && oldPrice <= price * 3;
}

/**
 * Offres fiables : carte graphique de BUREAU du bon modèle (ni portable, ni PC, ni accessoire, ni modèle voisin),
 * rattachée à un GPU connu, avec un lien vers le site de la boutique. Ne supprime rien en base : filtre l'affichage.
 */
export function validOffers<O extends OfferLike>(offers: readonly O[], gpus: readonly GpuLike[]): O[] {
  const byId = new Map(gpus.map((g) => [g.id, g]));
  return offers.filter((o) => {
    const gpu = byId.get(o.gpu_id);
    return Boolean(gpu) && isDesktopGpuOffer(o.title, gpu!) && hasValidMerchantUrl(o);
  });
}

const AIB_BRANDS: [string, RegExp][] = [
  ["ASUS", /\basus\b|\brog\b|\btuf\b/],
  ["MSI", /\bmsi\b/],
  ["Gigabyte", /\bgigabyte\b|\baorus\b/],
  ["Sapphire", /\bsapphire\b/],
  ["PowerColor", /\bpowercolor\b|\bpower color\b/],
  ["XFX", /\bxfx\b/],
  ["ASRock", /\basrock\b/],
  ["Zotac", /\bzotac\b/],
  ["Gainward", /\bgainward\b/],
  ["Palit", /\bpalit\b/],
  ["PNY", /\bpny\b/],
  ["Inno3D", /\binno3d\b|\binno 3d\b/],
  ["KFA2 / Galax", /\bkfa2\b|\bgalax\b/],
  ["Colorful", /\bcolorful\b/],
  ["Sparkle", /\bsparkle\b/],
  ["Acer", /\bacer\b|\bpredator\b/],
  ["Manli", /\bmanli\b/],
  ["Founders Edition (NVIDIA)", /\bfounders edition\b/],
  ["Limited Edition (Intel)", /\blimited edition\b/],
];

/** Fabricant de la carte (version « AIB ») déduit du titre de l'offre ; null si le titre ne le dit pas. */
export function detectAib(title: string): string | null {
  const t = normalizeTitle(title);
  return AIB_BRANDS.find(([, re]) => re.test(t))?.[0] ?? null;
}

/** Capacité mémoire annoncée dans le titre (« 16 Go », « 12GB », « 8G »), si elle est sans ambiguïté. */
export function detectVramGb(title: string): number | null {
  const t = normalizeTitle(title);
  const found = new Set<number>();
  for (const m of t.matchAll(/\bo?(\d{1,2}) ?(?:go|gb|g)\b/g)) {
    const n = Number(m[1]);
    if ([2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32].includes(n)) found.add(n);
  }
  return found.size === 1 ? [...found][0]! : null;
}

export interface GpuSpecs {
  series: string | null;
  architecture: string | null;
  vramOptions: number[];
  memoryType: string | null;
  memoryBusBits: number | null;
  imageUrl: string | null;
}

/** Fiche technique : valeurs de la base si présentes, sinon celles du catalogue embarqué ; sinon rien (jamais inventé). */
export function gpuSpecs(gpu: GpuLike): GpuSpecs {
  const cat = findCatalogueGpu(gpu);
  return {
    series: gpu.series ?? cat?.series ?? null,
    architecture: gpu.architecture ?? cat?.architecture ?? null,
    vramOptions: gpu.vram_options?.length ? gpu.vram_options : (cat?.vramGb ?? []),
    memoryType: gpu.memory_type ?? cat?.memoryType ?? null,
    memoryBusBits: gpu.memory_bus_bits ?? cat?.memoryBusBits ?? null,
    imageUrl: gpu.image_url ?? null,
  };
}

/** Offres d'un GPU triées par prix croissant (à prix égal : en stock d'abord, puis la plus récente). */
export function sortOffersByPrice<O extends OfferLike>(offers: readonly O[]): O[] {
  return [...offers].sort(
    (a, b) =>
      a.price - b.price ||
      Number(b.in_stock) - Number(a.in_stock) ||
      b.last_checked_at.localeCompare(a.last_checked_at),
  );
}
