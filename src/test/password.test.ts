import { describe, expect, it } from "vitest";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validateEmail, validatePassword } from "@/lib/password";

describe("validatePassword", () => {
  it("accepte un mot de passe avec lettres et chiffres de longueur suffisante", () => {
    expect(validatePassword("carte2026")).toBeNull();
    expect(validatePassword("a".repeat(PASSWORD_MIN_LENGTH - 1) + "1")).toBeNull();
  });

  it("refuse un mot de passe trop court", () => {
    expect(validatePassword("abc123")).toMatch(/au moins 8 caractères/);
    expect(validatePassword("a1".repeat(PASSWORD_MIN_LENGTH / 2 - 1))).not.toBeNull();
  });

  it("refuse un mot de passe sans chiffre ou sans lettre", () => {
    expect(validatePassword("uniquementdeslettres")).toMatch(/une lettre et un chiffre/);
    expect(validatePassword("1234567890")).toMatch(/une lettre et un chiffre/);
  });

  it("refuse un mot de passe plus long que la limite de Supabase", () => {
    expect(validatePassword("a1" + "b".repeat(PASSWORD_MAX_LENGTH))).toMatch(/dépasser/);
    expect(validatePassword("a1" + "b".repeat(PASSWORD_MAX_LENGTH - 2))).toBeNull();
  });
});

describe("validateEmail", () => {
  it("accepte une adresse correcte, même avec des espaces autour", () => {
    expect(validateEmail("nom@exemple.fr")).toBeNull();
    expect(validateEmail("  nom@exemple.fr ")).toBeNull();
  });

  it("refuse une adresse incorrecte", () => {
    expect(validateEmail("")).not.toBeNull();
    expect(validateEmail("nom@exemple")).not.toBeNull();
    expect(validateEmail("nom exemple@fr.fr")).not.toBeNull();
  });
});
