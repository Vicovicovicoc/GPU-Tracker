import { describe, expect, it } from "vitest";
import { classifyOffer, isDesktopGpuOffer, normalizeTitle, titleMatches } from "@/lib/offer-classifier";

const kind = (title: string, brand?: string) => classifyOffer(title, brand).kind;

describe("normalizeTitle", () => {
  it("sépare le suffixe collé au numéro et la famille collée au numéro", () => {
    expect(normalizeTitle("ASUS TUF-RTX5070TI-O16G-GAMING")).toBe("asus tuf rtx 5070 ti o16 g gaming");
    expect(normalizeTitle("RX7900XTX 24Go")).toBe("rx 7900 xtx 24 go");
  });
  it("laisse intacts les noms Intel et GDDR6X", () => {
    expect(normalizeTitle("Intel Arc B580 GDDR6X")).toBe("intel arc b580 gddr6x");
  });
});

describe("titleMatches — un modèle n'est pas confondu avec son voisin", () => {
  it.each([
    ["MSI GeForce RTX 5070 Ventus 3X", "5070", true],
    ["GeForce RTX 5070 Ti 16G", "5070", false],
    ["GeForce RTX 5070 Super", "5070", false],
    ["GeForce RTX 5070 Ti 16G", "5070 ti", true],
    ["GeForce RTX 4070 Ti Super", "4070 ti", false],
    ["GeForce RTX 4070 Ti Super", "4070 ti super", true],
    ["GeForce RTX 4070 Super", "4070", false],
    ["Radeon RX 7900 XTX 24 Go", "7900 xt", false],
    ["Radeon RX 7900 XTX 24 Go", "7900 xtx", true],
    ["Radeon RX 7900 XT 20 Go", "7900 xt", true],
    ["Radeon RX 7900 GRE", "7900 xt", false],
    ["Radeon RX 6700 XT", "6700", false],
    ["Radeon RX 6750 XT", "6700 xt", false],
    ["RX 6600 XT", "6600", false],
    ["Sapphire Radeon RX 9060 XT 16G", "9060 xt", true],
    ["ASUS TUF-RTX5070TI-O16G-GAMING", "5070 ti", true],
    ["GeForce RTX 3060 Ti 8 Go", "3060", false],
    ["GeForce RTX 3060 12 Go", "3060", true],
    ["Intel Arc B580 Limited Edition", "b580", true],
    ["Intel Arc B570", "b580", false],
    ["Processeur AMD Ryzen 5 7600X", "7600", false],
    ["Intel Core i7-6700K", "6700", false],
    ["Gigabyte GeForce RTX 5060 Ti 16G, 5060 ti", "5060", false],
  ])("%s ↔ %s → %s", (title, token, expected) => {
    expect(titleMatches(title, token)).toBe(expected);
  });
});

describe("classifyOffer — cartes graphiques de bureau", () => {
  it.each([
    ["MSI GeForce RTX 5070 Ventus 3X OC 12 Go GDDR7"],
    ["ASUS Dual GeForce RTX 4060 OC Edition 8 Go - Carte graphique pour PC Gamer"],
    ["Gigabyte AORUS GeForce RTX 5090 MASTER 32G"],
    ["ASUS ROG Strix GeForce RTX 5080 OC 16 Go"],
    ["ASUS TUF Gaming GeForce RTX 4070 Ti Super OC 16 Go"],
    ["Sapphire NITRO+ Radeon RX 9070 XT 16 Go"],
    ["Sapphire PULSE Radeon RX 7600 8 Go"],
    ["PowerColor Hellhound Radeon RX 9070 16 Go"],
    ["XFX Speedster Radeon RX 6600 8GB"],
    ["Zotac Gaming GeForce RTX 3060 Twin Edge 12GB"],
    ["Gainward GeForce RTX 5060 Ti Python III 16 Go"],
    ["NVIDIA GeForce RTX 5090 Founders Edition"],
    ["Carte graphique RTX 3050 6 Go"],
    ["ASUS DUAL-RTX5070-O12G"],
  ])("accepte : %s", (title) => {
    expect(kind(title)).toBe("desktop_gpu");
  });

  it("accepte les cartes AMD et Intel avec leur propre vocabulaire", () => {
    expect(kind("Sapphire Radeon RX 7800 XT 16 Go", "AMD")).toBe("desktop_gpu");
    expect(kind("Intel Arc B580 12 Go", "Intel")).toBe("desktop_gpu");
    expect(kind("ASRock Intel Arc A770 Phantom Gaming 16 Go", "Intel")).toBe("desktop_gpu");
  });

  it.each([
    ["PC Portable Gamer ASUS TUF Gaming A16 - RTX 5070 - 16\" - 32 Go"],
    ["MSI Katana 15 B13VFK-1456FR - Intel Core i7 - RTX 4060 - 15.6 pouces"],
    ["Lenovo Legion 5 15IRX9 GeForce RTX 4060"],
    ["Acer Nitro V 16 ANV16-41 RTX 4050"],
    ["GeForce RTX 4090 Laptop GPU 16 Go"],
    ["NVIDIA GeForce RTX 5070 Ti Mobile"],
    ["Gaming Laptop 17 pouces RTX 4070"],
    ["ASUS ROG Strix G16 G614 RTX 5070 Ti"],
    ["Gigabyte AORUS 16X RTX 4070"],
    ["HP OMEN 16 RTX 4060 8 Go"],
  ])("rejette le PC portable : %s", (title) => {
    expect(kind(title)).toBe("laptop");
  });

  it.each([
    ["PC Gamer Ryzen 7 7800X3D RTX 5070 32 Go 2 To"],
    ["Ordinateur de bureau gaming - RTX 4060 - 16 Go DDR5 - SSD 1 To - Windows 11"],
    ["Unité centrale Tour Gamer i5-14400F RTX 5060"],
    ["PC Gaming Intel Core i7 14700F RTX 4070 Super"],
    ["Mini PC Gaming GeForce RTX 3050"],
  ])("rejette le PC complet : %s", (title) => {
    expect(kind(title)).toBe("prebuilt_pc");
  });

  it("rejette les processeurs, les accessoires et les cartes professionnelles", () => {
    expect(kind("AMD Ryzen 5 7600 3.8 GHz Radeon Graphics", "AMD")).toBe("cpu");
    expect(kind("Intel Core i7-6700K 4 GHz")).toBe("cpu");
    expect(kind("Bykski Waterblock pour RTX 4090 Founders Edition")).toBe("accessory");
    expect(kind("Câble 12VHPWR pour RTX 5090 600W")).toBe("accessory");
    expect(kind("Alimentation 1000W ATX 3.1 compatible RTX 5090")).toBe("accessory");
    expect(kind("Support anti sag pour carte graphique RTX")).toBe("accessory");
    expect(kind("NVIDIA RTX A4000 16 Go")).toBe("professional");
    expect(kind("NVIDIA RTX PRO 6000 Blackwell")).toBe("professional");
    expect(kind("Quadro RTX 4000")).toBe("professional");
    expect(kind("Radeon PRO W7800", "AMD")).toBe("professional");
  });

  it("rejette ce qui n'est pas une carte graphique de la marque du GPU suivi", () => {
    expect(kind("Cooler Master Hyper 212 ventirad", "AMD")).toBe("not_gpu");
    expect(kind("Sapphire Radeon RX 7600", "NVIDIA")).toBe("not_gpu");
  });
});

describe("isDesktopGpuOffer — classement + modèle exact", () => {
  const rtx5070 = { brand: "NVIDIA", match_token: "5070" };
  it("accepte la bonne carte de bureau", () => {
    expect(isDesktopGpuOffer("MSI GeForce RTX 5070 Ventus 3X", rtx5070)).toBe(true);
  });
  it("rejette un portable du même modèle, un modèle voisin et un PC complet", () => {
    expect(isDesktopGpuOffer("PC Portable MSI Katana 15 RTX 5070 16\"", rtx5070)).toBe(false);
    expect(isDesktopGpuOffer("GeForce RTX 5070 Ti 16 Go", rtx5070)).toBe(false);
    expect(isDesktopGpuOffer("PC Gamer Ryzen 7 RTX 5070 32 Go", rtx5070)).toBe(false);
  });
});
