// Régénère drizzle/migrations/0004_catalogue_gpu.sql depuis src/lib/gpu-catalogue.ts.
// Usage : bun scripts/generate-catalogue-migration.ts
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCatalogueMigrationSql } from "../src/lib/gpu-catalogue-sql";

const target = resolve(import.meta.dirname, "../drizzle/migrations/0004_catalogue_gpu.sql");
writeFileSync(target, buildCatalogueMigrationSql());
console.log(`écrit : ${target}`);
