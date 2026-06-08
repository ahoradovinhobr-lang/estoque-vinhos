export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_BYTES = 72;

const commonPasswords = new Set([
  "123456789",
  "1234567890",
  "admin123456",
  "administrador",
  "estoque123",
  "gerente123",
  "lol123456",
  "password",
  "password123",
  "qwerty123",
  "senha123",
  "senha123456"
]);

export function validatePasswordPolicy(password: string): string | null {
  const characters = Array.from(password).length;
  const bytes = new TextEncoder().encode(password).length;
  const normalized = password.toLowerCase();

  if (characters < PASSWORD_MIN_LENGTH) {
    return `Senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  if (bytes > PASSWORD_MAX_BYTES) {
    return `Senha deve ter no maximo ${PASSWORD_MAX_BYTES} bytes.`;
  }

  if (commonPasswords.has(normalized)) {
    return "Senha muito comum. Use uma frase longa e exclusiva.";
  }

  return null;
}
