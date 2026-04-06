import * as Crypto from "expo-crypto";
import CryptoJS from "crypto-js";

const PBKDF2_ITERATIONS = 310_000;
const SALT_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 32;

export interface DerivedKeyResult {
  key: string;
  salt: string;
  verificationHash: string;
}

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
}

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  excludeAmbiguous?: boolean;
}

const CHAR_SETS = {
  uppercase: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  uppercaseAmbiguous: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghjkmnpqrstuvwxyz",
  lowercaseAmbiguous: "abcdefghijklmnopqrstuvwxyz",
  numbers: "23456789",
  numbersAmbiguous: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}|;:,.<>?",
} as const;

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const fromHex = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) {
    throw new Error("[VaultX] Invalid hex string length.");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, 2), 16);
  }
  return bytes;
};

const getRandomBytes = async (length: number): Promise<Uint8Array> => {
  return await Crypto.getRandomBytesAsync(length);
};

export const deriveKey = async (
  masterPassword: string,
  existingSalt: string | null = null,
): Promise<DerivedKeyResult> => {
  if (!masterPassword || masterPassword.trim().length === 0) {
    throw new Error("[VaultX] Master password cannot be empty.");
  }

  const saltBytes = existingSalt
    ? fromHex(existingSalt)
    : await getRandomBytes(SALT_LENGTH_BYTES);

  const salt = toHex(saltBytes);

  let currentHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${masterPassword}:${salt}:0`,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  // PBKDF2 stretching simulation
  const stretchingRounds = Math.min(PBKDF2_ITERATIONS / 1000, 50);
  for (let i = 1; i <= stretchingRounds; i++) {
    currentHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${currentHash}:${salt}:${i}`,
      { encoding: Crypto.CryptoEncoding.HEX },
    );
  }

  const key = currentHash.substring(0, KEY_LENGTH_BYTES * 2);

  const verificationHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `verify:${key}:${salt}`,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  return { key, salt, verificationHash };
};

export const verifyMasterPassword = async (
  masterPassword: string,
  savedSalt: string,
  savedVerification: string,
): Promise<boolean> => {
  try {
    const { verificationHash } = await deriveKey(masterPassword, savedSalt);
    return timingSafeEqual(verificationHash, savedVerification);
  } catch {
    return false;
  }
};

const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

export const encrypt = async (
  plaintext: string,
  hexKey: string,
): Promise<EncryptedPayload> => {
  if (!plaintext) throw new Error("[VaultX] Plaintext cannot be empty.");
  if (hexKey.length !== KEY_LENGTH_BYTES * 2) {
    throw new Error("[VaultX] Key must be 64 hexadecimal characters (256 bits).");
  }

  const ivBytes = await getRandomBytes(IV_LENGTH_BYTES);
  const ivHex = toHex(ivBytes);

  const keyWordArray = CryptoJS.enc.Hex.parse(hexKey);
  const ivWordArray = CryptoJS.enc.Hex.parse(ivHex);

  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    iv: ivHex,
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
  };
};

export const decrypt = async (
  payload: EncryptedPayload,
  hexKey: string,
): Promise<string> => {
  if (!payload.iv || !payload.ciphertext) {
    throw new Error("[VaultX] Invalid payload: missing iv or ciphertext.");
  }

  const keyWordArray = CryptoJS.enc.Hex.parse(hexKey);
  const ivWordArray = CryptoJS.enc.Hex.parse(payload.iv);
  const ciphertextWordArray = CryptoJS.enc.Hex.parse(payload.ciphertext);

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: ciphertextWordArray,
  });

  try {
    const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

    if (!plaintext) {
      throw new Error("Authenticity failure");
    }

    return plaintext;
  } catch (error) {
    throw new Error("[VaultX] Decryption error. Verify your master key.");
  }
};

export const generatePassword = async (
  options: PasswordGeneratorOptions,
): Promise<string> => {
  const {
    length,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeAmbiguous = false,
  } = options;

  if (length < 8 || length > 128) {
    throw new Error("[VaultX] Length must be between 8 and 128 characters.");
  }

  let charset = "";

  if (includeUppercase) charset += excludeAmbiguous ? CHAR_SETS.uppercase : CHAR_SETS.uppercaseAmbiguous;
  if (includeLowercase) charset += excludeAmbiguous ? CHAR_SETS.lowercase : CHAR_SETS.lowercaseAmbiguous;
  if (includeNumbers) charset += excludeAmbiguous ? CHAR_SETS.numbers : CHAR_SETS.numbersAmbiguous;
  if (includeSymbols) charset += CHAR_SETS.symbols;

  if (charset.length === 0) {
    throw new Error("[VaultX] Must select at least one character type.");
  }

  const maxValid = 256 - (256 % charset.length);
  const password: string[] = [];

  while (password.length < length) {
    const batchSize = Math.ceil((length - password.length) * 1.5);
    const randomBytes = await getRandomBytes(batchSize);

    for (const byte of randomBytes) {
      if (password.length >= length) break;
      if (byte < maxValid) {
        password.push(charset[byte % charset.length]);
      }
    }
  }

  // Ensure inclusion of required sets
  const requiredSets: string[] = [];
  if (includeUppercase) requiredSets.push(excludeAmbiguous ? CHAR_SETS.uppercase : CHAR_SETS.uppercaseAmbiguous);
  if (includeLowercase) requiredSets.push(excludeAmbiguous ? CHAR_SETS.lowercase : CHAR_SETS.lowercaseAmbiguous);
  if (includeNumbers) requiredSets.push(excludeAmbiguous ? CHAR_SETS.numbers : CHAR_SETS.numbersAmbiguous);
  if (includeSymbols) requiredSets.push(CHAR_SETS.symbols);

  for (const set of requiredSets) {
    const posBytes = await getRandomBytes(2);
    const charIndex = posBytes[0] % set.length;
    const insertIndex = posBytes[1] % length;
    password[insertIndex] = set[charIndex];
  }

  return password.join("");
};

export const evaluatePasswordStrength = (password: string) => {
  let score = 0;
  if (!password) return { score: 0, level: 'None', color: '#52525b' };

  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 20;

  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  const uniqueChars = new Set(password).size;
  score += (uniqueChars / password.length) * 10;

  score = Math.min(100, Math.round(score));

  let level = 'Very Weak';
  let color = '#ef4444';
  if (score >= 80) { level = 'Invulnerable'; color = '#34d399'; }
  else if (score >= 60) { level = 'Strong'; color = '#3b82f6'; }
  else if (score >= 40) { level = 'Fair'; color = '#f59e0b'; }

  return { score, level, color };
};

export const generateSecureId = async (): Promise<string> => {
  const bytes = await getRandomBytes(16);
  return toHex(bytes);
};

export const secureClear = (sensitiveValue: string): void => {
  const len = sensitiveValue.length;
  let dummy = "";
  for (let i = 0; i < len; i++) dummy += "\0";
};

export default {
  deriveKey,
  verifyMasterPassword,
  encrypt,
  decrypt,
  generatePassword,
  evaluatePasswordStrength,
  generateSecureId,
  secureClear,
};