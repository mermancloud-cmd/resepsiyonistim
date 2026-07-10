/**
 * Tests for subscription/iban-payment.ts — server-side IBAN payment logic
 *
 * Mocks Supabase admin client at the module boundary.
 * createAdminClient() returns a mutable mock object we control per test.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitIBANPayment, confirmIBANPayment } from "@/lib/subscription/iban-payment";

// ─── Valid UUIDs ───────────────────────────────────────────────────────────────

const TENANT_ID = "596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999";
const PAYMENT_ID = "550e8400-e29b-41d4-a716-446655440000";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const mockClient = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockClient),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Default rpc response: sequence ref code
  mockClient.rpc.mockResolvedValue({ data: 42, error: null });
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

function mockInsertOnce(result: { data?: any; error?: any }) {
  const singleFn = vi.fn().mockResolvedValue(result);
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockClient.from.mockReturnValue({
    insert: insertFn,
    select: selectFn,
    update: vi.fn(),
    order: vi.fn().mockReturnThis(),
  });
  return { insertFn, selectFn, singleFn };
}

function mockUpdateOnce(result: { data?: any; error?: any }) {
  const singleFn = vi.fn().mockResolvedValue(result);
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  const eq2 = vi.fn().mockReturnValue({ select: selectFn });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const updateFn = vi.fn().mockReturnValue({ eq: eq1 });
  mockClient.from.mockReturnValue({
    insert: vi.fn(),
    select: vi.fn(),
    update: updateFn,
    order: vi.fn().mockReturnThis(),
  });
  return { updateFn, eq1, eq2, selectFn, singleFn };
}

// ─── submitIBANPayment ─────────────────────────────────────────────────────────

describe("submitIBANPayment", () => {
  const validInput = {
    tenant_id: TENANT_ID,
    plan_id: "pro" as const,
    amount: 2999,
    currency: "TRY" as const,
    iban_last4: "8742",
    bank_name: "Ziraat Bankası",
  };

  it("inserts a pending payment record with correct fields", async () => {
    const { insertFn } = mockInsertOnce({ data: { id: "inserted-pay-001" }, error: null });

    const result = await submitIBANPayment(validInput);

    expect(result.success).toBe(true);
    expect(result.data!.id).toBe("inserted-pay-001");
    expect(mockClient.from).toHaveBeenCalledWith("subscription_iban_payments");
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: TENANT_ID,
        plan_id: "pro",
        amount: 2999,
        status: "pending",
        iban_last4: "8742",
      })
    );
  });

  it("returns validation error for invalid plan_id", async () => {
    mockInsertOnce({ data: { id: "x" }, error: null });

    const result = await submitIBANPayment({
      ...validInput,
      plan_id: "invalid-plan" as any,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Doğrulama hatası");
  });

  it("rejects iban_last4 shorter than 4 digits", async () => {
    mockInsertOnce({ data: { id: "x" }, error: null });

    const result = await submitIBANPayment({ ...validInput, iban_last4: "12" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Doğrulama hatası");
  });

  it("retries with new reference code on unique violation (23505)", async () => {
    const single1 = vi.fn().mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate key" } });
    const single2 = vi.fn().mockResolvedValue({ data: { id: "retry-pay-002" }, error: null });
    const select1 = vi.fn().mockReturnValue({ single: single1 });
    const select2 = vi.fn().mockReturnValue({ single: single2 });

    let callCount = 0;
    const insertFn = vi.fn().mockImplementation(() => {
      callCount++;
      return { select: callCount === 1 ? select1 : select2 };
    });

    mockClient.from.mockReturnValue({
      insert: insertFn,
      update: vi.fn(),
      select: vi.fn(),
      order: vi.fn().mockReturnThis(),
    });

    const result = await submitIBANPayment(validInput);

    expect(result.success).toBe(true);
    expect(result.data!.id).toBe("retry-pay-002");
    expect(callCount).toBe(2);
  });

  it("returns error when both insert attempts fail", async () => {
    const single1 = vi.fn().mockResolvedValue({ data: null, error: { code: "23505", message: "dup" } });
    const single2 = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST301", message: "denied" } });
    const select1 = vi.fn().mockReturnValue({ single: single1 });
    const select2 = vi.fn().mockReturnValue({ single: single2 });

    let callCount = 0;
    const insertFn = vi.fn().mockImplementation(() => {
      callCount++;
      return { select: callCount === 1 ? select1 : select2 };
    });

    mockClient.from.mockReturnValue({
      insert: insertFn,
      update: vi.fn(),
      select: vi.fn(),
      order: vi.fn().mockReturnThis(),
    });

    const result = await submitIBANPayment(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Ödeme kaydedilemedi");
  });
});

// ─── confirmIBANPayment ────────────────────────────────────────────────────────

describe("confirmIBANPayment", () => {
  it("approves a pending payment", async () => {
    const { eq2 } = mockUpdateOnce({ data: { id: PAYMENT_ID, status: "approved" }, error: null });

    const result = await confirmIBANPayment({
      payment_id: PAYMENT_ID,
      action: "approve",
      notes: "Test onayı",
    });

    expect(result.success).toBe(true);
    expect(result.data!.status).toBe("approved");
    // Should check status=pending
    expect(eq2).toHaveBeenCalledWith("status", "pending");
  });

  it("rejects a payment", async () => {
    const { eq2 } = mockUpdateOnce({ data: { id: PAYMENT_ID, status: "rejected" }, error: null });

    const result = await confirmIBANPayment({
      payment_id: PAYMENT_ID,
      action: "reject",
    });

    expect(result.success).toBe(true);
    expect(result.data!.status).toBe("rejected");
    expect(eq2).toHaveBeenCalledWith("status", "pending");
  });

  it("returns not-found when already processed", async () => {
    mockUpdateOnce({ data: null, error: null });

    const result = await confirmIBANPayment({
      payment_id: PAYMENT_ID,
      action: "approve",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("bulunamadı");
  });

  it("returns validation error for non-UUID payment_id", async () => {
    mockUpdateOnce({ data: {}, error: null });

    const result = await confirmIBANPayment({
      payment_id: "not-a-uuid",
      action: "approve",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Doğrulama hatası");
  });

  it("updates reviewed_at and reviewed_by on approval", async () => {
    const { updateFn } = mockUpdateOnce({ data: { id: PAYMENT_ID, status: "approved" }, error: null });

    await confirmIBANPayment({
      payment_id: PAYMENT_ID,
      action: "approve",
    });

    const callArg = updateFn.mock.calls[0][0];
    expect(callArg.status).toBe("approved");
    expect(callArg.reviewed_at).toBeDefined();
    expect(callArg.reviewed_by).toBe("admin");
  });
});
