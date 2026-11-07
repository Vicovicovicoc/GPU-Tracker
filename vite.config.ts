// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Production builds only replace `import.meta.env.VITE_X` (dot notation).
// Rewrite bracket access `import.meta.env['VITE_X']` to dot notation before
// compilation so generated files (which we must not edit) get their values.
const normalizeEnvAccess = {
  name: "normalize-import-meta-env-bracket-access",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (id.includes("node_modules") || !/\.[cm]?[jt]sx?$/.test(id.split("?")[0] ?? id)) return null;
    if (!code.includes("import.meta.env[")) return null;
    const out = code.replace(
      /import\.meta\.env\[\s*(['"])(VITE_[A-Za-z0-9_]+)\1\s*\]/g,
      "import.meta.env.$2",
    );
    return out === code ? null : { code: out, map: null };
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: { plugins: [normalizeEnvAccess] },
});
