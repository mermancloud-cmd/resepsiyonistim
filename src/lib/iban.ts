// ─── IBAN Validation Helpers ─────────────────────────────────────────────────
// ISO 13616 IBAN validation — TR IBAN structure: TR + 2 check digits + 5 digit bank + 1 digit reserve + 16 digit account = 26 chars
// ──────────────────────────────────────────────────────────────────────────────

const IBAN_COUNTRY_LENGTHS: Record<string, number> = {
  TR: 26,
  AL: 28,
  AD: 24,
  AT: 20,
  AZ: 28,
  BH: 22,
  BE: 16,
  BA: 20,
  BR: 29,
  BG: 22,
  CR: 22,
  HR: 21,
  CY: 28,
  CZ: 24,
  DK: 18,
  DO: 28,
  EE: 20,
  FO: 18,
  FI: 18,
  FR: 27,
  GE: 22,
  DE: 22,
  GI: 23,
  GR: 27,
  GL: 18,
  GT: 28,
  HU: 28,
  IS: 26,
  IE: 22,
  IL: 23,
  IT: 27,
  JO: 30,
  KZ: 20,
  XK: 20,
  KW: 30,
  LV: 21,
  LB: 28,
  LI: 21,
  LT: 20,
  LU: 20,
  MT: 31,
  MR: 27,
  MU: 30,
  MC: 27,
  MD: 24,
  ME: 22,
  NL: 18,
  MK: 19,
  NO: 15,
  PK: 24,
  PS: 29,
  PL: 28,
  PT: 25,
  QA: 29,
  RO: 24,
  SM: 27,
  SA: 24,
  RS: 22,
  SK: 24,
  SI: 19,
  ES: 24,
  SE: 24,
  CH: 21,
  TN: 24,
  AE: 23,
  GB: 22,
  VA: 22,
  VG: 24,
};

/**
 * Normalize IBAN: strip spaces, dashes, and convert to uppercase
 */
export function normalizeIBAN(iban: string): string {
  return iban.replace(/[\s\-]/g, "").toUpperCase();
}

/**
 * Format IBAN in readable groups (4 chars each)
 * TR330001009000000000123456 → TR33 0001 0090 0000 0000 1234 56
 */
export function formatIBAN(iban: string): string {
  const clean = normalizeIBAN(iban);
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Mask IBAN for display — show first 4 and last 4 chars
 * TR33 0001 0090 0000 0000 1234 56 → TR33 ···· ···· ···· 1234 56
 */
export function maskIBAN(iban: string): string {
  const clean = normalizeIBAN(iban);
  if (clean.length <= 8) return clean;
  const first4 = clean.slice(0, 4);
  const last4 = clean.slice(-4);
  const middleCount = Math.floor((clean.length - 8) / 4);
  const masked = `${first4} ${"···· ".repeat(middleCount)}${last4}`;
  return masked;
}

/**
 * Extract country code from IBAN (first 2 letters)
 */
export function getIBANCountry(iban: string): string {
  return normalizeIBAN(iban).slice(0, 2);
}

/**
 * Parse IBAN into components (for TR IBANs)
 * TR33 0001 0090 0000 0000 1234 56
 * → { country: TR, check: 33, bank: 0001, branch: 0090, account: 000000123456, suffix: 56 }
 */
export function parseIBAN(iban: string): {
  country: string;
  checkDigits: string;
  bankCode?: string;
  accountNumber?: string;
} {
  const clean = normalizeIBAN(iban);
  if (clean.length < 4) return { country: clean.slice(0, 2), checkDigits: "" };

  const country = clean.slice(0, 2);
  const checkDigits = clean.slice(2, 4);
  const rest = clean.slice(4);

  // For TR: 5 digit bank + 1 digit reserve + 16 digit account = 22 chars remaining
  if (country === "TR" && rest.length >= 22) {
    return {
      country,
      checkDigits,
      bankCode: rest.slice(0, 5),
      accountNumber: rest.slice(6),
    };
  }

  return {
    country,
    checkDigits,
    bankCode: rest.slice(0, 4) || undefined,
    accountNumber: rest.slice(4) || undefined,
  };
}

/**
 * IBAN validation error codes
 */
export type IBANValidationError =
  | "TOO_SHORT"
  | "TOO_LONG"
  | "INVALID_COUNTRY"
  | "INVALID_CHARS"
  | "INVALID_LENGTH"
  | "INVALID_CHECKSUM"
  | "MISSING";

export interface IBANValidationResult {
  valid: boolean;
  error?: IBANValidationError;
  errorMessage?: string;
}

const errorMessages: Record<IBANValidationError, string> = {
  TOO_SHORT: "IBAN çok kısa (en az 8 karakter olmalıdır)",
  TOO_LONG: "IBAN çok uzun",
  INVALID_COUNTRY: "Geçersiz ülke kodu",
  INVALID_CHARS: "IBAN yalnızca harf ve rakam içermelidir",
  INVALID_LENGTH: "Ülke için geçersiz IBAN uzunluğu",
  INVALID_CHECKSUM: "IBAN doğrulama basamağı geçersiz — IBAN'ı kontrol edin",
  MISSING: "IBAN numarası gereklidir",
};

/**
 * Validate IBAN using ISO 13616 checksum (mod-97)
 */
export function validateIBAN(iban: string): IBANValidationResult {
  const clean = normalizeIBAN(iban);

  if (!clean) {
    return { valid: false, error: "MISSING", errorMessage: errorMessages.MISSING };
  }

  if (clean.length < 8) {
    return { valid: false, error: "TOO_SHORT", errorMessage: errorMessages.TOO_SHORT };
  }

  if (clean.length > 34) {
    return { valid: false, error: "TOO_LONG", errorMessage: errorMessages.TOO_LONG };
  }

  // Only alphanumeric
  if (!/^[A-Z0-9]+$/.test(clean)) {
    return { valid: false, error: "INVALID_CHARS", errorMessage: errorMessages.INVALID_CHARS };
  }

  const country = clean.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(country)) {
    return { valid: false, error: "INVALID_COUNTRY", errorMessage: errorMessages.INVALID_COUNTRY };
  }

  // Check country-specific length (if known)
  const expectedLength = IBAN_COUNTRY_LENGTHS[country];
  if (expectedLength && clean.length !== expectedLength) {
    return {
      valid: false,
      error: "INVALID_LENGTH",
      errorMessage: `${errorMessages.INVALID_LENGTH} (${country} için ${expectedLength} karakter beklenir, ${clean.length} karakter girildi)`,
    };
  }

  // ISO 13616 mod-97 checksum
  // Move first 4 chars to end, replace letters with numbers (A=10..Z=35), compute mod 97
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const numeric = rearranged
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 65) {
        // A-Z → 10-35
        return (code - 55).toString();
      }
      return ch;
    })
    .join("");

  // BigInt mod 97
  try {
    const remainder = BigInt(numeric) % 97n;
    if (remainder !== 1n) {
      return { valid: false, error: "INVALID_CHECKSUM", errorMessage: errorMessages.INVALID_CHECKSUM };
    }
  } catch {
    // numeric string too large for BigInt — treat as invalid
    return { valid: false, error: "INVALID_CHECKSUM", errorMessage: errorMessages.INVALID_CHECKSUM };
  }

  return { valid: true };
}

/**
 * Get the Turkish bank name from bank code (first 5 digits after TR+checksum)
 */
const TR_BANK_CODES: Record<string, string> = {
  "00010": "T.C. Ziraat Bankası",
  "00012": "Türkiye Halk Bankası",
  "00015": "Türkiye Vakıflar Bankası",
  "00017": "Türkiye İş Bankası",
  "00020": "Türkiye Garanti Bankası",
  "00024": "Yapı ve Kredi Bankası",
  "00028": "Akbank",
  "00032": "Şekerbank",
  "00034": "Denizbank",
  "00036": "QNB Finansbank",
  "00038": "TEB (Türk Ekonomi Bankası)",
  "00040": "HSBC Bank",
  "00041": "ING Bank",
  "00042": "Burgan Bank",
  "00043": "Alternatif Bank",
  "00044": "Fibabanka",
  "00046": "Anadolubank",
  "00048": "Odeabank",
  "00058": "Kuveyt Türk Katılım Bankası",
  "00059": "Türkiye Finans Katılım Bankası",
  "00060": "Ziraat Katılım",
  "00061": "Vakıf Katılım",
  "00062": "Albaraka Türk",
  "00064": "Emlak Katılım",
  "00067": "Diley (Dijital banka)",
  "00101": "İller Bankası",
  "00123": "Türk Eximbank",
  "00124": "Merkez Bankası",
};

/**
 * Detect Turkish bank name from IBAN (TR format)
 */
export function detectBankFromIBAN(iban: string): string | null {
  const parsed = parseIBAN(iban);
  if (parsed.country !== "TR" || !parsed.bankCode) return null;
  return TR_BANK_CODES[parsed.bankCode] ?? null;
}
