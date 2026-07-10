/**
 * Integration test for /api/webhooks/iban-payment route
 *
 * Tests: auth, validation, event handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Chain builder helper ───────────────────────────────────────────────────────
// The route chain is: .from().update().eq(id).eq(status).select().single()

type ChainNode = Record<string, any>;

function buildSelectChain(data: any, error: any = null) {
  const singleFn = vi.fn().mockResolvedValue({ data, error });
  return { single: singleFn };
}

function buildUpdateChain(data: any, error: any = null) {
  const tail = buildSelectChain(data, error);
  const eqStatus = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(tail) });
  const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
  return { update: vi.fn().mockReturnValue({ eq: eqId }), eqId, eqStatus };
}

function buildSelectOnlyChain(data: any, error: any = null) {
  const tail = buildSelectChain(data, error);
  const eqFn = vi.fn().mockReturnValue(tail);
  return { select: vi.fn().mockReturnValue({ eq: eqFn }) };
}

// ─── Mock admin client ──────────────────────────────────────────────────────────

const mockTable = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockTable })),
}));

const VALID_PAYMENT_ID = "550e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-cron-secret-123");
  vi.stubEnv("INTERNAL_API_SECRET", "test-internal-secret-456");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

function buildRequest(body: any, secret?: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/webhooks/iban-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: secret } : {}),
    },
    body: JSON.stringify(body),
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/iban-payment — auth & validation", () => {
  it("returns 401 when no auth header is present", async () => {
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");
    const res = await POST(buildRequest({}));
    expect(res.status).toBe(401);
  });

  it("returns 401 when auth token is wrong", async () => {
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");
    const res = await POST(buildRequest({}, "Bearer wrong-token"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing required fields", async () => {
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");
    const res = await POST(buildRequest({}, "test-cron-secret-123"));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Geçersiz webhook payload");
  });

  it("accepts Bearer token format in Authorization header", async () => {
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");
    mockTable.mockReturnValue(buildSelectOnlyChain({ id: VALID_PAYMENT_ID, status: "pending" }));
    const res = await POST(buildRequest(
      { event: "payment.submitted", tenant_id: "596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999", payment_id: VALID_PAYMENT_ID, reference_code: "T1" },
      "Bearer test-cron-secret-123"
    ));
    expect(res.status).toBe(200);
  });

  it("falls back to INTERNAL_API_SECRET when CRON_SECRET is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");
    mockTable.mockReturnValue(buildSelectOnlyChain({ id: VALID_PAYMENT_ID, status: "pending" }));
    const res = await POST(buildRequest(
      { event: "payment.submitted", tenant_id: "596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999", payment_id: VALID_PAYMENT_ID, reference_code: "T2" },
      "test-internal-secret-456"
    ));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/webhooks/iban-payment — event handling", () => {
  it("accepts payment.submitted event", async () => {
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");
    mockTable.mockReturnValue(buildSelectOnlyChain({ id: VALID_PAYMENT_ID, tenant_id: "tenant-1", status: "pending" }));
    const res = await POST(buildRequest(
      { event: "payment.submitted", tenant_id: "596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999", payment_id: VALID_PAYMENT_ID, reference_code: "E1", amount: 2999 },
      "test-cron-secret-123"
    ));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.event).toBe("payment.submitted");
  });

  it("handles payment.approved event", async () => {
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");
    mockTable.mockReturnValue(buildUpdateChain({ id: VALID_PAYMENT_ID, status: "approved" }));
    const res = await POST(buildRequest(
      { event: "payment.approved", tenant_id: "596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999", payment_id: VALID_PAYMENT_ID, reference_code: "E2" },
      "test-cron-secret-123"
    ));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("approved");
  });

  it("handles payment.rejected event", async () => {
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");
    mockTable.mockReturnValue(buildUpdateChain({ id: VALID_PAYMENT_ID, status: "rejected" }));
    const res = await POST(buildRequest(
      { event: "payment.rejected", tenant_id: "596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999", payment_id: VALID_PAYMENT_ID, reference_code: "E3" },
      "test-cron-secret-123"
    ));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("rejected");
  });

  it("rejects unknown event type via zod", async () => {
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");
    const res = await POST(buildRequest(
      { event: "payment.unknown", tenant_id: "596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999", payment_id: VALID_PAYMENT_ID, reference_code: "E4" },
      "test-cron-secret-123"
    ));
    expect(res.status).toBe(400);
  });

  it("ensures update only affects pending payments", async () => {
    const { POST } = await import("@/app/api/webhooks/iban-payment/route");
    let eqStatusValue = "";
    const eqStatus = vi.fn().mockImplementation((field: string, val: any) => {
      eqStatusValue = `${field}=${val}`;
      return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: VALID_PAYMENT_ID, status: "approved" }, error: null }) }) };
    });
    const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
    mockTable.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: eqId }) });

    await POST(buildRequest(
      { event: "payment.approved", tenant_id: "596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999", payment_id: VALID_PAYMENT_ID, reference_code: "E5" },
      "test-cron-secret-123"
    ));
    expect(eqStatusValue).toBe("status=pending");
  });
});
