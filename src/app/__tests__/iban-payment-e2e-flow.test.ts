/**
 * Full-cycle E2E test for IBAN payment notification flow.
 *
 * Tests the complete path:
 *   Tenant submits IBAN payment → Webhook receives → Admin approves → Status confirmed
 *
 * This is an integration-level test using mocked Supabase.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { submitIBANPayment, confirmIBANPayment } from "@/lib/subscription/iban-payment";

// ─── Test constants ─────────────────────────────────────────────────────────────

const TENANT_ID = "596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999";
const PAYMENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const REF_CODE = "IBAN-E2E-001";

// ─── Mock admin client shared across imports ────────────────────────────────────

const mockTable = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockTable })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "e2e-test-cron-secret");
  vi.stubEnv("INTERNAL_API_SECRET", "e2e-test-internal-secret");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── Chain builders ─────────────────────────────────────────────────────────────

function tail(data: any, error: any = null) {
  return { single: vi.fn().mockResolvedValue({ data, error }) };
}

function mockSelectChain(data: any) {
  const t = tail(data);
  mockTable.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(t) }) });
}

function mockUpdateChain(data: any) {
  const t = tail(data);
  const eqStatus = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(t) });
  const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
  mockTable.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: eqId }), select: vi.fn() });
}

function mockInsertChain(data: any) {
  const t = tail(data);
  const selectFn = vi.fn().mockReturnValue(t);
  mockTable.mockReturnValue({ insert: vi.fn().mockReturnValue({ select: selectFn }), select: vi.fn(), update: vi.fn() });
}

function mockRpc() {
  // Also need rpc on the mock client — but createAdminClient returns { from: mockTable }
  // rpc is on the client, not on the table. The lib uses admin client's rpc.
  // We need to expose it from createAdminClient.
}

// ─── E2E Scenarios ──────────────────────────────────────────────────────────────

describe("IBAN Payment Full Cycle E2E", () => {
  it("Scenario 1: Happy path — tenant submits → webhook receives → admin approves", async () => {
    // ===== 1. TENANT SUBMITS =====
    // submitIBANPayment: .from().insert().select().single() + .rpc()
    const insertSingle = vi.fn().mockResolvedValue({ data: { id: PAYMENT_ID, status: "pending" }, error: null });
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
    const insertFn = vi.fn().mockReturnValue({ select: insertSelect });
    const rpcFn = vi.fn().mockResolvedValue({ data: 42, error: null });

    mockTable.mockReturnValue({ insert: insertFn, select: vi.fn(), update: vi.fn() });
    // Override createAdminClient to also return rpc
    const adminModule = await import("@/lib/supabase/admin");
    (adminModule.createAdminClient as any).mockReturnValue({ from: mockTable, rpc: rpcFn });

    const submitResult = await submitIBANPayment({
      tenant_id: TENANT_ID,
      plan_id: "pro",
      amount: 2999,
      currency: "TRY",
      iban_last4: "8742",
      bank_name: "Ziraat Bankası",
    });

    expect(submitResult.success).toBe(true);
    expect(submitResult.data!.status).toBe("pending");
    expect(submitResult.data!.id).toBe(PAYMENT_ID);

    // Verify correct table reference
    expect(mockTable).toHaveBeenCalledWith("subscription_iban_payments");

    // ===== 2. EXTERNAL SYSTEM SENDS WEBHOOK =====
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");

    // payment.submitted: .select().eq().single()
    mockTable.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: PAYMENT_ID, tenant_id: TENANT_ID, status: "pending" }, error: null }) }),
      }),
    });

    const webhookReq = new NextRequest("http://localhost:3000/api/webhooks/iban-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "e2e-test-cron-secret" },
      body: JSON.stringify({
        event: "payment.submitted",
        tenant_id: TENANT_ID,
        payment_id: PAYMENT_ID,
        reference_code: REF_CODE,
        amount: 2999,
      }),
    });

    const webhookRes = await POST(webhookReq);
    const webhookJson = await webhookRes.json();
    expect(webhookRes.status).toBe(200);
    expect(webhookJson.success).toBe(true);
    expect(webhookJson.event).toBe("payment.submitted");

    // ===== 3. ADMIN APPROVES IN PANEL =====
    // confirmIBANPayment: .from().update().eq().eq().select().single()
    // Re-set the mock chain for update path
    const approveTail = { single: vi.fn().mockResolvedValue({ data: { id: PAYMENT_ID, status: "approved" }, error: null }) };
    const eqStatus = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(approveTail) });
    const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
    mockTable.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: eqId }), select: vi.fn() });

    const approveResult = await confirmIBANPayment({
      payment_id: PAYMENT_ID,
      action: "approve",
      notes: "Havale görüldü, onaylandı.",
    });

    expect(approveResult.success).toBe(true);
    expect(approveResult.data!.status).toBe("approved");

    // ===== 4. WEBHOOK RECEIVES APPROVED EVENT =====
    mockTable.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: PAYMENT_ID, status: "approved", tenant_id: TENANT_ID },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const approvedReq = new NextRequest("http://localhost:3000/api/webhooks/iban-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "e2e-test-cron-secret" },
      body: JSON.stringify({
        event: "payment.approved",
        tenant_id: TENANT_ID,
        payment_id: PAYMENT_ID,
        reference_code: REF_CODE,
      }),
    });

    const approvedRes = await POST(approvedReq);
    const approvedJson = await approvedRes.json();
    expect(approvedRes.status).toBe(200);
    expect(approvedJson.status).toBe("approved");
  });

  it("Scenario 2: Webhook rejects unauthorized request mid-cycle", async () => {
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");

    const res = await POST(new NextRequest("http://localhost:3000/api/webhooks/iban-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "payment.submitted",
        tenant_id: TENANT_ID,
        payment_id: PAYMENT_ID,
        reference_code: REF_CODE,
      }),
    }));

    expect(res.status).toBe(401);
  });

  it("Scenario 3: Missing payment_id on approval returns validation error", async () => {
    const approveResult = await confirmIBANPayment({
      payment_id: "",
      action: "approve",
    });

    expect(approveResult.success).toBe(false);
    expect(approveResult.error).toBe("Doğrulama hatası");
  });

  it("Scenario 4: Empty request body returns 400", async () => {
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");

    const req = new NextRequest("http://localhost:3000/api/webhooks/iban-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "e2e-test-cron-secret" },
      body: "{}",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("Scenario 5: Admin rejects after webhook submit", async () => {
    // ===== SUBMIT =====
    const insertSingle = vi.fn().mockResolvedValue({ data: { id: PAYMENT_ID, status: "pending" }, error: null });
    mockTable.mockReturnValue({ insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSingle }) }), select: vi.fn(), update: vi.fn() });
    const adminModule = await import("@/lib/supabase/admin");
    (adminModule.createAdminClient as any).mockReturnValue({ from: mockTable, rpc: vi.fn().mockResolvedValue({ data: 100, error: null }) });

    await submitIBANPayment({
      tenant_id: TENANT_ID,
      plan_id: "pro",
      amount: 1999,
      currency: "TRY",
      iban_last4: "1234",
      bank_name: "Garanti",
    });

    // ===== ADMIN REJECTS =====
    const rejectTail = { single: vi.fn().mockResolvedValue({ data: { id: PAYMENT_ID, status: "rejected" }, error: null }) };
    const eqStatus = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(rejectTail) });
    const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
    mockTable.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: eqId }), select: vi.fn() });

    const rejectResult = await confirmIBANPayment({
      payment_id: PAYMENT_ID,
      action: "reject",
      notes: "Tutar hatalı.",
    });

    expect(rejectResult.success).toBe(true);
    expect(rejectResult.data!.status).toBe("rejected");
  });
});
