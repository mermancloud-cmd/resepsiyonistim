import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const submitIBANPaymentSchema = z.object({
  tenant_id: z.string().uuid("Geçersiz tesis ID"),
  plan_id: z.enum(["starter", "pro", "business", "enterprise"]),
  amount: z.number().positive("Tutar pozitif olmalıdır"),
  currency: z.string().default("TRY"),
  iban_last4: z
    .string()
    .length(4, "IBAN son 4 hane 4 karakter olmalıdır")
    .regex(/^\d{4}$/, "IBAN son 4 hane yalnızca rakam içermelidir"),
});

const confirmIBANPaymentSchema = z.object({
  payment_id: z.string().uuid("Geçersiz ödeme ID"),
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────────

async function generateReferenceCode(
  supabase: ReturnType<typeof createAdminClient>
): Promise<string> {
  // Try sequence first
  const { data: seqResult } = await supabase.rpc("next_sub_iban_ref");
  if (seqResult) {
    return `SUB-2026-${String(seqResult).padStart(4, "0")}`;
  }

  // Fallback: random 4-digit
  const fallback = Math.floor(1000 + Math.random() * 9000);
  return `SUB-2026-${fallback}`;
}

// ─── POST: Submit IBAN Payment Notification ─────────────────────────────────────
// Called when an owner submits "I sent the money" with the last 4 digits of IBAN.
// Does NOT require auth — uses tenant_id + secret shared key for verification.

export async function submitIBANPayment(input: {
  tenant_id: string;
  plan_id: string;
  amount: number;
  currency?: string;
  iban_last4: string;
}) {
  const parsed = submitIBANPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Doğrulama hatası",
      details: parsed.error.issues.map((i) => i.message),
    };
  }

  const supabase = createAdminClient();
  const refCode = await generateReferenceCode(supabase);

  const { data, error } = await supabase
    .from("subscription_iban_payments")
    .insert({
      tenant_id: parsed.data.tenant_id,
      plan_id: parsed.data.plan_id,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      iban_last4: parsed.data.iban_last4,
      reference_code: refCode,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    // Retry with a different reference code if unique violation
    if (error.code === "23505") {
      const refCode2 = `SUB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: data2, error: error2 } = await supabase
        .from("subscription_iban_payments")
        .insert({
          tenant_id: parsed.data.tenant_id,
          plan_id: parsed.data.plan_id,
          amount: parsed.data.amount,
          currency: parsed.data.currency,
          iban_last4: parsed.data.iban_last4,
          reference_code: refCode2,
          status: "pending",
        })
        .select()
        .single();

      if (error2) {
        return { success: false, error: "Ödeme kaydedilemedi: " + error2.message };
      }
      return { success: true, data: data2 };
    }

    return { success: false, error: "Ödeme kaydedilemedi: " + error.message };
  }

  return { success: true, data };
}

// ─── POST: Confirm (Approve/Reject) IBAN Payment ────────────────────────────────
// Called by admin panel when owner approves or rejects the payment.
// On approve, subscription status changes to 'active' (via DB trigger).

export async function confirmIBANPayment(input: {
  payment_id: string;
  action: "approve" | "reject";
  notes?: string;
}) {
  const parsed = confirmIBANPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Doğrulama hatası",
      details: parsed.error.issues.map((i) => i.message),
    };
  }

  const supabase = createAdminClient();

  const newStatus = parsed.data.action === "approve" ? "approved" : "rejected";

  const { data, error } = await supabase
    .from("subscription_iban_payments")
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: "admin",
      notes: parsed.data.notes ?? null,
    })
    .eq("id", parsed.data.payment_id)
    .eq("status", "pending") // Only allow confirming pending payments
    .select()
    .single();

  if (error) {
    return { success: false, error: "Ödeme güncellenemedi: " + error.message };
  }

  if (!data) {
    return {
      success: false,
      error: "Ödeme bulunamadı veya zaten işlenmiş.",
    };
  }

  return { success: true, data };
}

// ─── GET: List pending subscription IBAN payments ───────────────────────────────

export async function getSubscriptionIBANPayments(tenantId?: string) {
  const supabase = createAdminClient();

  let query = supabase
    .from("subscription_iban_payments")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: data ?? [] };
}
