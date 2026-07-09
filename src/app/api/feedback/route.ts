import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const feedbackSubmitSchema = z.object({
  tenant_id: z.string().uuid("Geçerli bir işletme ID giriniz"),
  conversation_id: z.string().uuid().nullable().optional(),
  rating: z.number().int().min(1, "Puan 1-5 arası olmalıdır").max(5, "Puan 1-5 arası olmalıdır"),
  category: z.enum(
    ["genel", "hiz", "rezervasyon", "oda_bilgisi", "fiyat", "iletisim", "insan_kalitesi", "diger"],
    { error: "Geçerli bir kategori seçiniz" }
  ),
  comment: z.string().max(1000, "Yorum en fazla 1000 karakter olabilir").nullable().optional(),
});

export type FeedbackSubmitInput = z.infer<typeof feedbackSubmitSchema>;

// ─── POST /api/feedback ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = feedbackSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Doğrulama hatası",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { tenant_id, conversation_id, rating, category, comment } = parsed.data;

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("musteri_feedback")
      .insert({
        tenant_id,
        conversation_id: conversation_id ?? null,
        rating,
        category,
        comment: comment ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Feedback insert error:", error.message);
      return NextResponse.json({ error: "Geri bildirim kaydedilemedi" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("Feedback API error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
