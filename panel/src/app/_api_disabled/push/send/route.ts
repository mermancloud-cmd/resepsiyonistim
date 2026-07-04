import { type NextRequest } from "next/server"
/**
 * Push Bildirim Gönderme API'si
 * POST /api/push/send
 * Belirli bir tenant'ın tüm aktif aboneliklerine push bildirimi gönderir.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as webpush from "web-push";
import { configureWebPush } from "@/lib/push/vapid";

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
}

interface RequestBody {
  tenantId: string;
  payload: PushPayload;
}

interface SubscriptionRecord {
  id: string;
  subscription: PushSubscriptionJSON;
}

interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { tenantId, payload } = body;

    // Doğrulama
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "tenantId zorunludur." },
        { status: 400 }
      );
    }

    if (!payload?.title || !payload?.body) {
      return NextResponse.json(
        { success: false, error: "Bildirim başlığı ve içeriği zorunludur." },
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

    // VAPID yapılandır
    configureWebPush();

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Tenant'ın aktif aboneliklerini al
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("tenant_id", tenantId)
      .eq("platform", "web")
      .eq("enabled", true);

    if (error) {
      console.error("Abonelikler alınamadı:", error);
      return NextResponse.json(
        { success: false, error: "Abonelikler alınamadı." },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aktif abonelik bulunamadı.",
        sent: 0,
        failed: 0,
      });
    }

    // Bildirim payload'ını oluştur
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icon-192.png",
      badge: payload.badge || "/badge-72.png",
      data: payload.data || {},
    });

    let sent = 0;
    let failed = 0;
    const invalidSubscriptionIds: string[] = [];

    // Tüm aboneliklere bildirimi gönder
    const sendPromises = subscriptions.map(async (record: SubscriptionRecord) => {
      try {
        await webpush.sendNotification(
          record.subscription as webpush.PushSubscription,
          notificationPayload
        );
        sent++;
      } catch (error) {
        failed++;
        console.error(`Bildirim gönderilemedi (${record.id}):`, error);

        // 404 veya 410 hatası - abonelik artık geçerli değil
        if (error instanceof webpush.WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
          invalidSubscriptionIds.push(record.id);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    // Geçersiz abonelikleri temizle
    if (invalidSubscriptionIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ enabled: false })
        .in("id", invalidSubscriptionIds);

      console.log(
        `${invalidSubscriptionIds.length} geçersiz abonelik devre dışı bırakıldı.`
      );
    }

    return NextResponse.json({
      success: true,
      message: `${sent} bildirim gönderildi, ${failed} başarısız.`,
      sent,
      failed,
      cleanedUp: invalidSubscriptionIds.length,
    });
  } catch (error) {
    console.error("Bildirim gönderme API hatası:", error);
    return NextResponse.json(
      { success: false, error: "Bildirim gönderilemedi." },
      { status: 500 }
    );
  }
}
