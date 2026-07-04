/**
 * GET /api/subscription/status?tenant_id=xxx
 *
 * Returns the current subscription status for a tenant.
 * Used by the dashboard and subscription page to show plan info.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get("tenant_id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id parametresi zorunludur." },
        { status: 400 }
      );
    }

    // Try to fetch from Supabase
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: subscription, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Supabase query error:", error);
          throw error;
        }

        if (!subscription) {
          return NextResponse.json({
            status: "none",
            plan: null,
            message: "Henüz bir abonelik bulunmuyor.",
          });
        }

        // Check if trial has expired
        if (subscription.status === "trial" && subscription.trial_end) {
          const trialEnd = new Date(subscription.trial_end);
          if (trialEnd < new Date()) {
            return NextResponse.json({
              status: "expired",
              plan: subscription.plan_id,
              trialEnd: subscription.trial_end,
              message: "Deneme süresi sona erdi. Lütfen bir plan seçin.",
            });
          }
        }

        // Check if active subscription period has ended
        if (subscription.status === "active" && subscription.current_period_end) {
          const periodEnd = new Date(subscription.current_period_end);
          if (periodEnd < new Date()) {
            return NextResponse.json({
              status: "past_due",
              plan: subscription.plan_id,
              currentPeriodEnd: subscription.current_period_end,
              message: "Abonelik süresi dolmuş. Yenileme bekleniyor.",
            });
          }
        }

        return NextResponse.json({
          status: subscription.status,
          plan: subscription.plan_id,
          trialStart: subscription.trial_start,
          trialEnd: subscription.trial_end,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          iyzicoSubscriptionId: subscription.iyzico_subscription_id,
          createdAt: subscription.created_at,
          message: getStatusMessage(subscription.status),
        });
      }
    } catch (dbError) {
      console.error("Supabase not available:", dbError);
    }

    // Fallback: return mock data for development
    return NextResponse.json({
      status: "trial",
      plan: "pro",
      trialStart: new Date(Date.now() - 7 * 86400000).toISOString(),
      trialEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
      message: "Deneme sürümü aktif. 7 gün kaldı.",
      _mock: true,
    });
  } catch (error) {
    console.error("Subscription status error:", error);
    return NextResponse.json(
      { error: "Abonelik durumu alınamadı." },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "trial":
      return "Deneme süresi aktif.";
    case "active":
      return "Aboneliğiniz aktif.";
    case "past_due":
      return "Ödeme gecikmiş. Lütfen ödeme bilgilerinizi güncelleyin.";
    case "cancelled":
      return "Aboneliğiniz iptal edildi.";
    case "expired":
      return "Abonelik süresi sona erdi.";
    default:
      return "Bilinmeyen durum.";
  }
}
