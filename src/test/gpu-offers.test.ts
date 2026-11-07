import { describe, expect, it } from "vitest";
import { detectAib, detectVramGb, gpuSpecs, hasValidMerchantUrl, isPlausiblePromo, sortOffersByPrice, validOffers, type GpuLike, type OfferLike } from "@/lib/gpu-offers";

const gpu = (id: string, name: string, brand: string, token: string): GpuLike => ({ id, name, brand, match_token: token });
const gpus = [gpu("g5070", "GeForce RTX 5070", "NVIDIA", "5070"), gpu("g9070", "Radeon RX 9070", "AMD", "9070")];
const offer = (o: Partial<OfferLike>): OfferLike => ({
  id: "o", title: "MSI GeForce RTX 5070 Ventus", store: "ldlc", url: "https://www.ldlc.com/fiche/PB1.html",
  price: 600, old_price: null, in_stock: true, last_checked_at: "2026-11-07T08:00:00Z", gpu_id: "g5070", ...o,
});

describe("validOffers — Meilleures promotions et listes", () => {
  it("garde la carte de bureau du bon modèle", () => {
    expect(validOffers([offer({})], gpus)).toHaveLength(1);
  });
  it("écarte portables, PC complets, modèles voisins, GPU inconnus", () => {
    const bad = [
      offer({ id: "1", title: "PC Portable MSI Katana 15 RTX 5070 16\"" }),
      offer({ id: "2", title: "PC Gamer Ryzen 7 RTX 5070 32 Go" }),
      offer({ id: "3", title: "GeForce RTX 5070 Ti 16 Go" }),
      offer({ id: "4", gpu_id: "inconnu" }),
      offer({ id: "5", title: "RTX 5070 Laptop GPU" }),
    ];
    expect(validOffers(bad, gpus)).toEqual([]);
  });
  it("exige un lien sur le site de la boutique", () => {
    expect(validOffers([offer({ url: "https://evil.example/ldlc.com" })], gpus)).toEqual([]);
    expect(validOffers([offer({ url: "javascript:alert(1)" })], gpus)).toEqual([]);
    expect(validOffers([offer({ store: "amazon", url: "https://www.amazon.fr/dp/B0X" })], gpus)).toHaveLength(1);
    expect(hasValidMerchantUrl({ store: "inconnue", url: "https://www.ldlc.com/" })).toBe(false);
    expect(hasValidMerchantUrl({ store: "ldlc", url: "http://www.ldlc.com/x" })).toBe(false);
  });
});

describe("isPlausiblePromo", () => {
  it("accepte une vraie réduction et rejette un ancien prix aberrant ou inférieur", () => {
    expect(isPlausiblePromo(500, 600)).toBe(true);
    expect(isPlausiblePromo(500, 500)).toBe(false);
    expect(isPlausiblePromo(500, null)).toBe(false);
    expect(isPlausiblePromo(100, 2000)).toBe(false);
  });
});

describe("version du fabricant et mémoire déduites du titre", () => {
  it("reconnaît le fabricant de la carte", () => {
    expect(detectAib("ASUS Dual GeForce RTX 4060")).toBe("ASUS");
    expect(detectAib("Gigabyte AORUS Master")).toBe("Gigabyte");
    expect(detectAib("Sapphire NITRO+ Radeon RX 9070 XT")).toBe("Sapphire");
    expect(detectAib("NVIDIA GeForce RTX 5090 Founders Edition")).toBe("Founders Edition (NVIDIA)");
    expect(detectAib("Carte graphique RTX 3060")).toBeNull();
  });
  it("lit la capacité mémoire quand elle est sans ambiguïté", () => {
    expect(detectVramGb("GeForce RTX 5060 Ti 16 Go")).toBe(16);
    expect(detectVramGb("RTX 4060 Ti 8GB GDDR6")).toBe(8);
    expect(detectVramGb("ASUS TUF-RTX5070TI-O16G-GAMING")).toBe(16);
    expect(detectVramGb("RTX 5060 Ti")).toBeNull();
    expect(detectVramGb("RTX 3060 8 Go ou 12 Go")).toBeNull();
  });
});

describe("gpuSpecs — jamais de valeur inventée", () => {
  it("complète depuis le catalogue quand la base n'a pas encore les colonnes", () => {
    const s = gpuSpecs(gpu("x", "GeForce RTX 5060 Ti", "NVIDIA", "5060 ti"));
    expect(s).toMatchObject({ architecture: "Blackwell", vramOptions: [8, 16], memoryType: "GDDR7", memoryBusBits: 128, imageUrl: null });
  });
  it("laisse vide un GPU inconnu et donne priorité à la base", () => {
    expect(gpuSpecs(gpu("y", "Carte inconnue", "NVIDIA", "zzz"))).toEqual({ series: null, architecture: null, vramOptions: [], memoryType: null, memoryBusBits: null, imageUrl: null });
    expect(gpuSpecs({ ...gpu("z", "GeForce RTX 5070", "NVIDIA", "5070"), architecture: "Autre", image_url: "https://img/x.png" })).toMatchObject({ architecture: "Autre", imageUrl: "https://img/x.png" });
  });
});

describe("sortOffersByPrice", () => {
  it("trie par prix croissant sans muter l'entrée", () => {
    const list = [offer({ id: "a", price: 700 }), offer({ id: "b", price: 500, in_stock: false }), offer({ id: "c", price: 500 }), offer({ id: "d", price: 600 })];
    expect(sortOffersByPrice(list).map((o) => o.id)).toEqual(["c", "b", "d", "a"]);
    expect(list[0]!.id).toBe("a");
  });
});
