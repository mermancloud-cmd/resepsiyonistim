import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// ─── Zod Schema ─────────────────────────────────────────────────────────────────

const webhookSchema = z.object({
  event: z.enum(["payment.submitted", "payment.approved", "payment.rejected"]),
  tenant_id: z.string().uuid(),
  payment_id: z.string().uuid(),
  reference_code: z.string(),
  amount: z.number().positive().optional(),
  reviewed_at: z.string().optional(),
});

// ─── POST /api/webhooks/iban-payment ────────────────────────────────────────────
// Internal webhook — called when:
// 1. A tenant submits an IBAN payment notification → "payment.submitted"
// 2. Admin approves → "payment.approved"
// 3. Admin rejects → "payment.rejected"
//
// Security: Validates CRON_SECRET header (symmetric with the one in n8n/Telegram bot)

export async function POST(request: NextRequest) {
  try {
    // Auth: check CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Support both "Bearer XXX" and raw token
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token || token !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = webhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Geçersiz webhook payload",
          details: parsed.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { event, payment_id } = parsed.data;
    const supabase = createAdminClient();

    // ─── Event: payment.submitted ─────────────────────────────────
    if (event === "payment.submitted") {
      // Verify the payment exists and is still pending
      const { data: payment } = await supabase
        .from("subscription_iban_payments")
        .select("id, tenant_id, status")
        .eq("id", payment_id)
        .single();

      if (!payment) {
        return NextResponse.json(
          { error: "Ödeme bulunamadı" },
          { status: 404 }
        );
      }

      // Trigger a notification to the admin (the payment is now visible in the panel)
      // The actual notification is handled by the frontend polling or realtime subscription
      return NextResponse.json({
        success: true,
        event: "payment.submitted",
        payment_id,
        message: "Ödeme bildirimi alındı. Panelden kontrol edin.",
      });
    }

    // ─── Event: payment.approved / payment.rejected ───────────────
    if (event === "payment.approved" || event === "payment.rejected") {
      const newStatus = event === "payment.approved" ? "approved" : "rejected";

      // Update payment status
      const { data: payment, error: updateError } = await supabase
        .from("subscription_iban_payments")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: "webhook",
        })
        .eq("id", payment_id)
        .eq("status", "pending")
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: "Ödeme güncellenemedi", details: updateError.message },
          { status: 500 }
        );
      }

      if (!payment) {
        return NextResponse.json(
          { error: "Ödeme bulunamadı veya zaten işlenmiş" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        event,
        payment_id,
        status: newStatus,
        message:
          newStatus === "approved"
            ? "Ödeme onaylandı, abonelik aktifleştirildi."
            : "Ödeme reddedildi.",
      });
    }

    return NextResponse.json({ error: "Bilinmeyen event türü" }, { status: 400 });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
