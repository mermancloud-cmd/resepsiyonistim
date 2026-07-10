import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getTenantIdFromSession } from "@/lib/supabase/admin";
import { z } from "zod";

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const createBankAccountSchema = z.object({
  bank_name: z.string().min(1, "Banka adı zorunludur"),
  branch_name: z.string().optional().nullable(),
  account_holder: z.string().min(1, "Hesap sahibi zorunludur"),
  iban: z.string().min(8, "IBAN çok kısa").max(34, "IBAN çok uzun"),
  currency: z.enum(["TRY", "EUR", "USD", "GBP", "CHF", "RUB", "AED"], {
    error: "Geçerli bir para birimi seçiniz",
  }),
  facility_id: z.string().uuid().nullable().optional(),
  is_default: z.boolean().optional().default(false),
  swift_code: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

const updateBankAccountSchema = z.object({
  bank_name: z.string().min(1).optional(),
  branch_name: z.string().optional().nullable(),
  account_holder: z.string().min(1).optional(),
  iban: z.string().min(8).max(34).optional(),
  currency: z.enum(["TRY", "EUR", "USD", "GBP", "CHF", "RUB", "AED"]).optional(),
  facility_id: z.string().uuid().nullable().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  swift_code: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function normalizeIBAN(iban: string): string {
  return iban.replace(/[\s\-]/g, "").toUpperCase();
}

/**
 * Basic IBAN checksum validation (ISO 13616 mod-97)
 */
function validateIBANChecksum(iban: string): boolean {
  const clean = normalizeIBAN(iban);
  if (clean.length < 8 || clean.length > 34) return false;
  if (!/^[A-Z0-9]+$/.test(clean)) return false;

  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const numeric = rearranged
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 65) return (code - 55).toString();
      return ch;
    })
    .join("");

  try {
    return BigInt(numeric) % 97n === 1n;
  } catch {
    return false;
  }
}

// ─── GET /api/settings/bank-accounts ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantIdFromSession();
    const searchParams = request.nextUrl.searchParams;
    const facilityId = searchParams.get("facility_id");

    const supabase = createAdminClient();

    let query = supabase
      .from("bank_accounts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true })
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (facilityId) {
      // Filter for a specific facility (or global accounts with null facility_id)
      query = query.or(`facility_id.eq.${facilityId},facility_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Banka hesapları yüklenirken hata oluştu", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/settings/bank-accounts error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// ─── POST /api/settings/bank-accounts ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantIdFromSession();
    const body = await request.json();

    const parsed = createBankAccountSchema.safeParse(body);
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

    const cleanIban = normalizeIBAN(parsed.data.iban);

    // Validate IBAN checksum server-side
    if (!validateIBANChecksum(cleanIban)) {
      return NextResponse.json(
        { error: "IBAN doğrulama basamağı geçersiz — IBAN'ı kontrol edin" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check for duplicate IBAN in this tenant
    const { data: existing } = await supabase
      .from("bank_accounts")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("iban", cleanIban)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Bu IBAN zaten kayıtlı" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("bank_accounts")
      .insert({
        tenant_id: tenantId,
        bank_name: parsed.data.bank_name.trim(),
        branch_name: parsed.data.branch_name?.trim() ?? null,
        account_holder: parsed.data.account_holder.trim(),
        iban: cleanIban,
        currency: parsed.data.currency,
        facility_id: parsed.data.facility_id ?? null,
        is_default: parsed.data.is_default ?? false,
        is_active: true,
        swift_code: parsed.data.swift_code?.trim() ?? null,
        description: parsed.data.description?.trim() ?? null,
        sort_order: 0,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Bu IBAN zaten kayıtlı" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Banka hesabı eklenirken hata oluştu", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/settings/bank-accounts error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/settings/bank-accounts ───────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const tenantId = await getTenantIdFromSession();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Hesap ID gereklidir" },
        { status: 400 }
      );
    }

    const parsed = updateBankAccountSchema.safeParse(body);
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

    const updates: Record<string, unknown> = { ...parsed.data };
    delete (updates as any).id;

    // Normalize IBAN if updating
    if (updates.iban) {
      updates.iban = normalizeIBAN(updates.iban as string);

      if (!validateIBANChecksum(updates.iban as string)) {
        return NextResponse.json(
          { error: "IBAN doğrulama basamağı geçersiz" },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("bank_accounts")
      .update(updates)
      .eq("id", body.id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Banka hesabı güncellenirken hata oluştu", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("PATCH /api/settings/bank-accounts error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/settings/bank-accounts?id=xxx ───────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const tenantId = await getTenantIdFromSession();
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Hesap ID gereklidir" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("bank_accounts")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) {
      return NextResponse.json(
        { error: "Banka hesabı silinirken hata oluştu", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/settings/bank-accounts error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
