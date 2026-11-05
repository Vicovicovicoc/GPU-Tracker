/**
 * Règles de mot de passe appliquées à l'inscription, à la réinitialisation et
 * au changement de mot de passe. La connexion n'applique volontairement pas ces
 * règles : les comptes créés avec l'ancienne règle (6 caractères) doivent
 * pouvoir se connecter.
 */
export const PASSWORD_MIN_LENGTH = 8;
// Limite de bcrypt utilisée par Supabase : au-delà, le mot de passe serait tronqué.
export const PASSWORD_MAX_LENGTH = 72;

/** Retourne un message d'erreur en français, ou `null` si le mot de passe est valide. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  }
  return null;
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Retourne un message d'erreur en français, ou `null` si l'adresse e-mail semble valide. */
export function validateEmail(email: string): string | null {
  return EMAIL_PATTERN.test(email.trim()) ? null : "Entrez une adresse e-mail valide.";
}
