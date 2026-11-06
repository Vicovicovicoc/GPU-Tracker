import { describe, expect, it } from "vitest";
import { shouldReconcileMissingOffers } from "@/lib/parse-listing";

describe("stock reconciliation safety", () => {
  it("does not mark previous offers unavailable when no matching GPU listing was parsed", () => {
    expect(shouldReconcileMissingOffers([])).toBe(false);
  });

  it("allows reconciliation when at least one matching GPU listing was parsed", () => {
    expect(shouldReconcileMissingOffers([{ title: "Radeon RX 9060 XT", url: "https://shop.example/gpu", price: 399, old_price: null, in_stock: true }])).toBe(true);
  });
});
