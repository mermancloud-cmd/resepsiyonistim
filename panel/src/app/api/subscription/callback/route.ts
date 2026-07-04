/**
 * POST /api/subscription/callback
 *
 * Handles the IYZICO payment callback after checkout completion.
 * IYZICO POSTs back to this URL with the payment token.
 * We verify the payment and update the subscription in Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { retrieveCheckoutFormResult } from "@/lib/iyzico/client";
import { getPlanById } from "@/lib/subscription/plans";
import type { SubscriptionPlanId } from "@/lib/iyzico/types";

export async function POST(request: NextRequest) {
  try {
    // 1. Parse the callback
    // IYZICO sends form data OR JSON depending on config
    let token: string;
    let conversationId: string;

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      token = body.token;
      conversationId = body.conversationId;
    } else {
      const formData = await request.formData();
      token = formData.get("token") as string;
      conversationId = formData.get("conversationId") as string;
    }

    if (!token) {
      return NextResponse.json(
        { error: "Token bulunamadı." },
        { status: 400 }
      );
    }

    // 2. Verify payment with IYZICO
    const paymentResult = await retrieveCheckoutFormResult({
      locale: "tr",
      conversationId: conversationId ?? "",
      token,
    });

    if (paymentResult.status === "failure" || paymentResult.paymentStatus !== "SUCCESS") {
      console.error("IYZICO payment failed:", paymentResult.errorMessage);

      // Redirect to subscription page with error
      const redirectUrl = new URL("/subscription", process.env.NEXTAUTH_URL ?? "http://localhost:3000");
      redirectUrl.searchParams.set("payment", "failed");
      redirectUrl.searchParams.set("error", paymentResult.errorMessage ?? "Ödeme başarısız");

      return NextResponse.redirect(redirectUrl.toString(), 303);
    }

    // 3. Extract tenant_id from conversationId
    // Format: sub-{tenant_id}-{timestamp}
    const tenantId = conversationId?.replace(/^sub-/, "").replace(/-\d+$/, "");

    if (!tenantId) {
      console.error("Could not extract tenant_id from conversationId:", conversationId);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/subscription?payment=error`,
        303
      );
    }

    // 4. Extract plan from basket items
    const basketItem = paymentResult.itemTransactions?.[0];
    const planId = (basketItem?.itemId?.replace("plan-", "") ?? "pro") as SubscriptionPlanId;
    const plan = getPlanById(planId);

    if (!plan) {
      console.error("Could not determine plan from payment result:", basketItem?.itemId);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/subscription?payment=error`,
        303
      );
    }

    // 5. Update subscription in Supabase
    // Using dynamic import to avoid issues in static export builds
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const now = new Date();
        const periodEnd = new Date(
          now.getTime() + 30 * 86400000 // 30 days
        );

        // Upsert subscription (cancel any existing active ones first)
        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: now.toISOString(),
          })
          .eq("tenant_id", tenantId)
          .in("status", ["active", "trial"]);

        // Create new active subscription
        await supabase.from("subscriptions").insert({
          tenant_id: tenantId,
          plan_id: planId,
          status: "active",
          iyzico_subscription_id: paymentResult.itemTransactions?.[0]?.paymentTransactionId ?? null,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });
      } else {
        console.warn("Supabase not configured — subscription status not updated in DB");
      }
    } catch (dbError) {
      console.error("Failed to update subscription in Supabase:", dbError);
      // Payment was successful, so we still redirect to success
      // The subscription will need to be reconciled manually
    }

    // 6. Redirect to success page
    const redirectUrl = new URL("/subscription", process.env.NEXTAUTH_URL ?? "http://localhost:3000");
    redirectUrl.searchParams.set("payment", "success");
    redirectUrl.searchParams.set("plan", plan.name);

    return NextResponse.redirect(redirectUrl.toString(), 303);
  } catch (error) {
    console.error("Subscription callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/subscription?payment=error`,
      303
    );
  }
}
