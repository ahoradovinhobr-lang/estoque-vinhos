import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from "crypto";

export const MFA_ISSUER = "Estoque Vinhos";
export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_WINDOW = 1;
export const RECOVERY_CODE_COUNT = 10;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const RECOVERY_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const ENCRYPTION_VERSION = "v1";

function authSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
}

function encryptionKey(): Buffer {
  const secret = authSecret();

  if (secret.length < 32) {
    throw new Error("AUTH_SECRET precisa ter pelo menos 32 caracteres.");
  }

  return createHash("sha256")
    .update(secret)
    .update("estoque-vinhos:mfa-secret:v1")
    .digest();
}

function base64Url(value: Buffer): string {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

export function encryptMfaSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    base64Url(iv),
    base64Url(tag),
    base64Url(ciphertext)
  ].join(":");
}

export function decryptMfaSecret(encryptedSecret: string): string {
  const [version, encodedIv, encodedTag, encodedCiphertext] =
    encryptedSecret.split(":");

  if (
    version !== ENCRYPTION_VERSION ||
    !encodedIv ||
    !encodedTag ||
    !encodedCiphertext
  ) {
    throw new Error("Chave MFA invalida.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    fromBase64Url(encodedIv)
  );
  decipher.setAuthTag(fromBase64Url(encodedTag));

  return Buffer.concat([
    decipher.update(fromBase64Url(encodedCiphertext)),
    decipher.final()
  ]).toString("utf8");
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(value: string): Buffer {
  const normalized = value.toUpperCase().replace(/=+$/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let buffer = 0;

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);

    if (index === -1) {
      throw new Error("Chave MFA invalida.");
    }

    buffer = (buffer << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function createOtpAuthUri(input: {
  email: string;
  secret: string;
}): string {
  const label = `${MFA_ISSUER}:${input.email}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: MFA_ISSUER,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS)
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

function counterBuffer(counter: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(counter);
  return buffer;
}

function hotp(secret: string, counter: bigint): string {
  const digest = createHmac("sha1", base32Decode(secret))
    .update(counterBuffer(counter))
    .digest();
  const offset = digest[digest.length - 1] & 15;
  const binaryCode =
    ((digest[offset] & 127) << 24) |
    ((digest[offset + 1] & 255) << 16) |
    ((digest[offset + 2] & 255) << 8) |
    (digest[offset + 3] & 255);

  return String(binaryCode % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

function safeCodeEquals(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function normalizeTotpCode(code: string): string {
  return code.replace(/\s+/g, "");
}

export function verifyTotpCode(input: {
  secret: string;
  code: string;
  lastUsedCounter?: bigint | null;
}): { valid: true; counter: bigint } | { valid: false } {
  const code = normalizeTotpCode(input.code);

  if (!/^\d{6}$/.test(code)) {
    return { valid: false };
  }

  const currentCounter = BigInt(
    Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS)
  );

  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
    const counter = currentCounter + BigInt(offset);

    if (counter < 0n) {
      continue;
    }

    if (
      input.lastUsedCounter !== null &&
      input.lastUsedCounter !== undefined &&
      counter <= input.lastUsedCounter
    ) {
      continue;
    }

    if (safeCodeEquals(hotp(input.secret, counter), code)) {
      return { valid: true, counter };
    }
  }

  return { valid: false };
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const bytes = randomBytes(12);
    let code = "";

    for (const byte of bytes) {
      code += RECOVERY_CODE_ALPHABET[byte % RECOVERY_CODE_ALPHABET.length];
    }

    return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
  });
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
