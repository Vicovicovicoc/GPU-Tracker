import { describe, expect, it } from "vitest";
import { hasSupabaseConfig } from "@/lib/supabase-config";

describe("hasSupabaseConfig", () => {
  it("accepts a URL and a publishable key", () => {
    expect(hasSupabaseConfig({ url: "https://example.supabase.co", key: "sb_publishable_example" })).toBe(true);
  });

  it("rejects missing or whitespace-only values", () => {
    expect(hasSupabaseConfig({ url: "https://example.supabase.co" })).toBe(false);
    expect(hasSupabaseConfig({ url: " ", key: "sb_publishable_example" })).toBe(false);
    expect(hasSupabaseConfig({ url: "https://example.supabase.co", key: "  " })).toBe(false);
  });
});
