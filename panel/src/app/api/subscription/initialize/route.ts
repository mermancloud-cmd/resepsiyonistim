/**
 * POST /api/subscription/initialize
 *
 * Initialize an IYZICO checkout form for subscription payment.
 * Returns the HTML content to render the payment form.
 *
 * Body: { plan_id: "starter" | "pro" | "enterprise", tenant_id: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { initializeCheckoutForm, isIyzicoConfigured, getIyzicoEnvironment } from "@/lib/iyzico/client";
import { getPlanById } from "@/lib/subscription/plans";
import type { SubscriptionPlanId, IyzicoCheckoutFormRequest } from "@/lib/iyzico/types";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate IYZICO is configured
    if (!isIyzicoConfigured()) {
      return NextResponse.json(
        {
          error: "IYZICO yapılandırılmamış. Yönetici ile iletişime geçin.",
          code: "IYZICO_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const { plan_id, tenant_id, buyer } = body;

    if (!plan_id || !tenant_id) {
      return NextResponse.json(
        { error: "plan_id ve tenant_id zorunludur." },
        { status: 400 }
      );
    }

    const plan = getPlanById(plan_id as SubscriptionPlanId);
    if (!plan) {
      return NextResponse.json(
        { error: "Geçersiz plan seçimi." },
        { status: 400 }
      );
    }

    // 3. Build IYZICO checkout request
    const conversationId = `sub-${tenant_id}-${Date.now()}`;
    const callbackUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/subscription/callback`;

    const checkoutRequest: IyzicoCheckoutFormRequest = {
      locale: "tr",
      conversationId,
      price: plan.price.toFixed(2),
      paidPrice: plan.price.toFixed(2),
      currency: "TRY",
      paymentGroup: "SUBSCRIPTION",
      callbackUrl,
      enabledInstallments: [1, 2, 3],
      buyer: {
        id: tenant_id,
        name: buyer?.name ?? "Bungalov",
        surname: buyer?.surname ?? "Müşteri",
        email: buyer?.email ?? "info@bungalov.ai",
        phone: buyer?.phone ?? "+90 242 000 0000",
        identityNumber: buyer?.identityNumber ?? "11111111111", // Required by IYZICO, use placeholder
        registrationAddress: buyer?.address ?? "Antalya, Türkiye",
        city: buyer?.city ?? "Antalya",
        country: "Türkiye",
        zipCode: buyer?.zipCode ?? "07000",
      },
      shippingAddress: {
        address: buyer?.address ?? "Antalya, Türkiye",
        city: buyer?.city ?? "Antalya",
        country: "Türkiye",
        zipCode: buyer?.zipCode ?? "07000",
      },
      billingAddress: {
        address: buyer?.address ?? "Antalya, Türkiye",
        city: buyer?.city ?? "Antalya",
        country: "Türkiye",
        zipCode: buyer?.zipCode ?? "07000",
      },
      basketItems: [
        {
          id: `plan-${plan.id}`,
          name: `Bungalow AI - ${plan.name} Plan (Aylık)`,
          category1: "SaaS Abonelik",
          itemType: "VIRTUAL",
          price: plan.price.toFixed(2),
        },
      ],
    };

    // 4. Call IYZICO API
    const result = await initializeCheckoutForm(checkoutRequest);

    if (result.status === "failure") {
      console.error("IYZICO checkout init failed:", result.errorMessage);
      return NextResponse.json(
        {
          error: `Ödeme başlatılamadı: ${result.errorMessage ?? "Bilinmeyen hata"}`,
          code: result.errorCode,
        },
        { status: 502 }
      );
    }

    // 5. Return checkout form content
    return NextResponse.json({
      success: true,
      token: result.token,
      checkoutFormContent: result.checkoutFormContent,
      paymentPageUrl: result.paymentPageUrl,
      environment: getIyzicoEnvironment(),
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
      },
    });
  } catch (error) {
    console.error("Subscription initialization error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
