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
    const md = `[MSI GeForce RTX 4070 Ventus 2X 12G](/fiche/abc.html)

549,90 €

~~629,90 €~~

En stock

[Gigabyte RTX 4070 Eagle OC](https://www.ldlc.com/fiche/def.html)

599 €

Rupture`;
    const r = parseListing(md, "https://www.ldlc.com");
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ price: 549.9, old_price: 629.9, in_stock: true, url: "https://www.ldlc.com/fiche/abc.html" });
    expect(r[1]).toMatchObject({ price: 599, in_stock: false });
  });

  it("rejects lookalike domains that merely start with the shop hostname", () => {
    const md = `[Fraudulent RTX 4070 listing](https://www.ldlc.com.evil.example/product)

599 €`;
    expect(parseListing(md, "https://www.ldlc.com")).toEqual([]);
  });
});
