import { describe, expect, it } from "vitest";
import { discountPct, eur, titleMatches } from "@/lib/stores";

describe("discountPct", () => {
  it("calculates a discount only when the old price is higher", () => {
    expect(discountPct(80, 100)).toBe(20);
    expect(discountPct(100, 80)).toBe(0);
    expect(discountPct(100, null)).toBe(0);
  });
});

describe("titleMatches", () => {
  it("matches the requested GPU model", () => {
    expect(titleMatches("MSI GeForce RTX 5070 Ventus", "5070")).toBe(true);
  });

  it("does not confuse a base GPU with a Ti, XT or Super model", () => {
    expect(titleMatches("GeForce RTX 5070 Ti", "5070")).toBe(false);
    expect(titleMatches("Radeon RX 9070 XT", "9070")).toBe(false);
    expect(titleMatches("GeForce RTX 5070 Super", "5070")).toBe(false);
  });

  it("supports model tokens containing suffixes", () => {
    expect(titleMatches("Sapphire Radeon RX 9060 XT", "9060 xt")).toBe(true);
  });
});

describe("eur", () => {
  it("handles missing values and formats euro prices", () => {
    expect(eur(null)).toBe("—");
    expect(eur(1234.5)).toContain("1");
    expect(eur(1234.5)).toContain("€");
  });
});
