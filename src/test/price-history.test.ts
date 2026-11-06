import { describe, expect, it } from "vitest";
import { shouldRecordPriceHistory } from "@/lib/price-history";

describe("price history deduplication", () => {
  const previous = {
    price: 399,
    in_stock: true,
    recorded_at: "2026-11-05T05:00:00.000Z",
  };

  it("records the first observation", () => {
    expect(shouldRecordPriceHistory(null, { price: 399, in_stock: true }, new Date("2026-11-05T05:01:00Z"))).toBe(true);
  });

  it("skips an identical retry within the same daily refresh window", () => {
    expect(shouldRecordPriceHistory(previous, { price: 399, in_stock: true }, new Date("2026-11-05T05:10:00Z"))).toBe(false);
  });

  it("records a price change immediately", () => {
    expect(shouldRecordPriceHistory(previous, { price: 389, in_stock: true }, new Date("2026-11-05T05:10:00Z"))).toBe(true);
  });

  it("records a stock-state change immediately", () => {
    expect(shouldRecordPriceHistory(previous, { price: 399, in_stock: false }, new Date("2026-11-05T05:10:00Z"))).toBe(true);
  });

  it("records the next daily snapshot after the retry window", () => {
    expect(shouldRecordPriceHistory(previous, { price: 399, in_stock: true }, new Date("2026-11-06T05:00:00Z"))).toBe(true);
  });
});
