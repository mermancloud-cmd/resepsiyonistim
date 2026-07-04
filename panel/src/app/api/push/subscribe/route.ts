import { type NextRequest } from "next/server"
/**
 * Push Abonelik Kayıt API'si
 * POST /api/push/subscribe
 * İstemciden gelen push aboneliğini Supabase'e kaydeder.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface PushSubscriptionJSON {
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

interface RequestBody {
  subscription: PushSubscriptionJSON;
  tenantId?: string;
}

/**
 * Abonelik nesnesini doğrula
 */
function validateSubscription(sub: PushSubscriptionJSON): string | null {
  if (!sub || typeof sub !== "object") {
    return "Abonelik nesnesi geçerli değil.";
  }
  if (!sub.endpoint || typeof sub.endpoint !== "string") {
    return "Endpoint alanı zorunludur.";
  }
  if (!sub.keys?.p256dh || !sub.keys?.auth) {
    return "Abonelik anahtarları (p256dh, auth) zorunludur.";
  }
  if (sub.endpoint.length < 50) {
    return "Endpoint geçersiz görünüyor.";
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { subscription, tenantId } = body;

    // Aboneliği doğrula
    const validationError = validateSubscription(subscription);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // Supabase service role ile bağlantı kur
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase yapılandırması eksik.");
      return NextResponse.json(
        { success: false, error: "Sunucu yapılandırma hatası." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Tenant ID - header'dan veya body'den al
    const resolvedTenantId = tenantId || request.headers.get("x-tenant-id") || "default";

    // Mevcut kaydı kontrol et (aynı endpoint ile)
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("tenant_id", resolvedTenantId)
      .eq("platform", "web")
      .maybeSingle();

    if (existing) {
      // Mevcut kaydı güncelle
      const { error } = await supabase
        .from("push_subscriptions")
        .update({
          subscription: subscription,
          enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error("Abonelik güncellenemedi:", error);
        return NextResponse.json(
          { success: false, error: "Abonelik güncellenemedi." },
          { status: 500 }
        );
      }
    } else {
      // Yeni kayıt ekle
      const { error } = await supabase
        .from("push_subscriptions")
        .insert({
          tenant_id: resolvedTenantId,
          subscription: subscription,
          platform: "web",
          enabled: true,
        });

      if (error) {
        console.error("Abonelik kaydedilemedi:", error);
        return NextResponse.json(
          { success: false, error: "Abonelik kaydedilemedi." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Push aboneliği başarıyla kaydedildi.",
    });
  } catch (error) {
    console.error("Abonelik API hatası:", error);
    return NextResponse.json(
      { success: false, error: "Geçersiz istek." },
      { status: 400 }
    );
  }
}
