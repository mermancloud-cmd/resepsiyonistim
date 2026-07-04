import { type NextRequest } from "next/server"
/**
 * Push Abonelik İptal API'si
 * POST /api/push/unsubscribe
 * İstemciden gelen push aboneliğini Supabase'den kaldırır.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface PushSubscriptionJSON {
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
}

interface RequestBody {
  subscription: PushSubscriptionJSON;
  tenantId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { subscription, tenantId } = body;

    if (!subscription?.endpoint) {
      return NextResponse.json(
        { success: false, error: "Endpoint alanı zorunludur." },
        { status: 400 }
      );
    }

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
    const resolvedTenantId = tenantId || request.headers.get("x-tenant-id") || "default";

    // Aboneliği devre dışı bırak (hard delete yerine soft disable)
    const { error } = await supabase
      .from("push_subscriptions")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("tenant_id", resolvedTenantId)
      .eq("platform", "web");

    if (error) {
      console.error("Abonelik iptal edilemedi:", error);
      return NextResponse.json(
        { success: false, error: "Abonelik iptal edilemedi." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Push aboneliği başarıyla iptal edildi.",
    });
  } catch (error) {
    console.error("Abonelik iptal API hatası:", error);
    return NextResponse.json(
      { success: false, error: "Geçersiz istek." },
      { status: 400 }
    );
  }
}
