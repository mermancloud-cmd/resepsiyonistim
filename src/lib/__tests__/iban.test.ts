/**
 * Test suites for IBAN validation helpers (src/lib/iban.ts)
 *
 * Valid TR IBAN structure: TR + 2 check digits + 5 bank code + 1 reserved + 16 account = 26 chars
 * Bank codes: 00010 = Ziraat, 00017 = İş Bankası
 * Mod-97 checksums computed offline with Python.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeIBAN,
  formatIBAN,
  maskIBAN,
  parseIBAN,
  validateIBAN,
  detectBankFromIBAN,
} from "@/lib/iban";

describe("normalizeIBAN", () => {
  it("strips spaces and dashes, uppercases", () => {
    expect(normalizeIBAN("tr33 0001 0090-0000")).toBe("TR33000100900000");
  });

  it("handles already clean input", () => {
    expect(normalizeIBAN("TR330001009000000000123456")).toBe("TR330001009000000000123456");
  });

  it("handles empty string", () => {
    expect(normalizeIBAN("")).toBe("");
  });
});

describe("formatIBAN", () => {
  it("groups every 4 chars with spaces", () => {
    expect(formatIBAN("TR330001009000000000123456")).toBe("TR33 0001 0090 0000 0000 1234 56");
  });

  it("normalizes then formats", () => {
    expect(formatIBAN("tr33-0001-0090")).toBe("TR33 0001 0090");
  });
});

describe("maskIBAN", () => {
  it("shows first 4 and last 4 chars, middle masked", () => {
    const result = maskIBAN("TR420001000000000000000001");
    expect(result).toContain("TR42");
    expect(result).toContain("0001");
    expect(result).toContain("····");
  });

  it("returns full string for short IBANs", () => {
    expect(maskIBAN("TR12")).toBe("TR12");
  });
});

describe("parseIBAN", () => {
  it("parses TR IBAN into country, check, bank, account", () => {
    // TR420001000000000000000001 → bankCode=00010 (Ziraat), account=0000000000000001
    const result = parseIBAN("TR420001000000000000000001");
    expect(result.country).toBe("TR");
    expect(result.checkDigits).toBe("42");
    expect(result.bankCode).toBe("00010");
    expect(result.accountNumber).toBe("0000000000000001");
  });

  it("handles non-TR IBAN gracefully", () => {
    const result = parseIBAN("DE89370400440532013000");
    expect(result.country).toBe("DE");
    expect(result.checkDigits).toBe("89");
  });
});

describe("validateIBAN", () => {
  it("validates a correct TR IBAN (mod-97 checksum)", () => {
    // TR690001000000000000000000 — computed valid mod-97 IBAN
    const result = validateIBAN("TR690001000000000000000000");
    expect(result.valid).toBe(true);
  });

  it("rejects empty string", () => {
    const result = validateIBAN("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("MISSING");
  });

  it("rejects too short IBAN", () => {
    const result = validateIBAN("TR12");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("TOO_SHORT");
  });

  it("rejects invalid characters", () => {
    const result = validateIBAN("TR33 0001 0090!!!!");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("INVALID_CHARS");
  });

  it("rejects invalid country code", () => {
    const result = validateIBAN("XX330001009000000000123456");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("INVALID_COUNTRY");
  });

  it("rejects wrong length for TR", () => {
    const result = validateIBAN("TR33000100900000000012345678");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("INVALID_LENGTH");
  });

  it("rejects invalid checksum (single digit change)", () => {
    // TR690001000000000000000001 differs by last digit from valid TR690001000000000000000000
    const result = validateIBAN("TR690001000000000000000001");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("INVALID_CHECKSUM");
  });

  it("accepts a valid Ziraat Bankası IBAN", () => {
    const result = validateIBAN("TR420001000000000000000001");
    expect(result.valid).toBe(true);
  });

  it("accepts a valid İş Bankası IBAN", () => {
    const result = validateIBAN("TR380001700000000000000001");
    expect(result.valid).toBe(true);
  });
});

describe("detectBankFromIBAN", () => {
  it("detects Ziraat from bank code 00010", () => {
    // TR420001000000000000000001 → bank code 00010
    const result = detectBankFromIBAN("TR420001000000000000000001");
    expect(result).toBe("T.C. Ziraat Bankası");
  });

  it("detects İş Bankası from bank code 00017", () => {
    // TR380001700000000000000001 → bank code 00017
    const result = detectBankFromIBAN("TR380001700000000000000001");
    expect(result).toBe("Türkiye İş Bankası");
  });

  it("returns null for non-TR IBAN", () => {
    const result = detectBankFromIBAN("DE89370400440532013000");
    expect(result).toBeNull();
  });

  it("returns null for unknown bank code", () => {
    // TR999999xxxx → unknown bank code
    const result = detectBankFromIBAN("TR999999000000000000000000");
    expect(result).toBeNull();
  });
});
