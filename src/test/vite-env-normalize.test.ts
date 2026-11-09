import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { transformWithOxc } from "vite";
import { normalizeSupabaseEnvAccess, supabaseEnvNormalizePlugin } from "@/lib/vite-env-normalize";

const define = {
  "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://fake-url.test"),
  "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("sb_publishable_fake"),
  "import.meta.env": JSON.stringify({ BASE_URL: "/", PROD: true }),
};
const oxc = async (code: string) => (await transformWithOxc(code, "x.ts", { define })).code;

describe("production env injection", () => {
  it("OXC define does NOT replace bracket access (regression proof)", async () => {
    const out = await oxc("export const a = import.meta.env['VITE_SUPABASE_URL'];");
    expect(out.includes("https://fake-url.test")).toBe(false);
  });

  it("OXC define replaces dot access", async () => {
    const out = await oxc("export const a = import.meta.env.VITE_SUPABASE_URL;");
    expect(out.includes("https://fake-url.test")).toBe(true);
  });

  it("supabase-config.ts uses dot access and gets both values injected", async () => {
    const out = await oxc(readFileSync("src/lib/supabase-config.ts", "utf8"));
    expect(out.includes("https://fake-url.test")).toBe(true);
    expect(out.includes("sb_publishable_fake")).toBe(true);
  });

  it("plugin makes the generated client get both values injected", async () => {
    const src = readFileSync("src/integrations/supabase/client.ts", "utf8");
    const res = supabaseEnvNormalizePlugin().transform(
      src,
      "/p/src/integrations/supabase/client.ts",
    );
    expect(res).not.toBeNull();
    const out = await oxc(res!.code);
    expect(out.includes("https://fake-url.test")).toBe(true);
    expect(out.includes("sb_publishable_fake")).toBe(true);
  });

  it("plugin ignores other files", () => {
    expect(
      supabaseEnvNormalizePlugin().transform(
        "import.meta.env['VITE_SUPABASE_URL']",
        "/p/src/other.ts",
      ),
    ).toBeNull();
  });

  it("normalizes both quote styles", () => {
    expect(normalizeSupabaseEnvAccess(`import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]`)).toBe(
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY",
    );
  });
});
