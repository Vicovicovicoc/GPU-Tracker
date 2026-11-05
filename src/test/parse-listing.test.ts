import { describe, expect, it } from "vitest";
import { extractPrices, parseListing } from "@/lib/parse-listing";

describe("extractPrices", () => {
  it("reads French formats", () => {
    expect(extractPrices("1 299,99 €")).toEqual([1299.99]);
    expect(extractPrices("449€90")).toEqual([449.9]);
  });
});

describe("parseListing", () => {
  it("finds title, price, old price and stock", () => {
    const md = `[MSI GeForce RTX 4070 Ventus 2X 12G](/fiche/abc.html)\n\n549,90 €\n\n~~629,90 €~~\n\nEn stock\n\n[Gigabyte RTX 4070 Eagle OC](https://www.ldlc.com/fiche/def.html)\n\n599 €\n\nRupture`;
    const r = parseListing(md, "https://www.ldlc.com");
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ price: 549.9, old_price: 629.9, in_stock: true, url: "https://www.ldlc.com/fiche/abc.html" });
    expect(r[1]).toMatchObject({ price: 599, in_stock: false });
  });
});
