/**
 * IYZICO Payment Gateway Types
 * Used for SaaS subscription payments only (NOT guest reservations)
 */

// ─── IYZICO API Request/Response Types ─────────────────────────────────────────

export interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string; // sandbox: https://sandbox-api.iyzipay.com, production: https://api.iyzipay.com
}

export interface IyzicoBuyer {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  identityNumber: string; // TC kimlik no (can use 11111111111 for testing)
  registrationAddress: string;
  city: string;
  country: string;
  zipCode: string;
}

export interface IyzicoAddress {
  address: string;
  city: string;
  country: string;
  zipCode: string;
}

export interface IyzicoBasketItem {
  id: string;
  name: string;
  category1: string;
  itemType: "VIRTUAL" | "PHYSICAL";
  price: string; // IYZICO expects string prices
}

export interface IyzicoCheckoutFormRequest {
  locale: "tr" | "en";
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: "TRY" | "USD" | "EUR";
  paymentGroup: "PRODUCT" | "LISTING" | "SUBSCRIPTION";
  callbackUrl: string;
  enabledInstallments: number[];
  buyer: IyzicoBuyer;
  shippingAddress: IyzicoAddress;
  billingAddress: IyzicoAddress;
  basketItems: IyzicoBasketItem[];
}

export interface IyzicoCheckoutFormResponse {
  status: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  token: string;
  checkoutFormContent: string; // HTML content to render
  paymentPageUrl?: string;
  systemTime: number;
}

export interface IyzicoCheckoutFormResultRequest {
  locale: "tr" | "en";
  conversationId: string;
  token: string;
}

export interface IyzicoPaymentResult {
  status: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  paymentStatus: "SUCCESS" | "FAILURE" | "INIT_THEN_PAY" | "REWARD" | "CREDIT_CARD_REGISTRATION";
  price?: number;
  paidPrice?: number;
  currency?: string;
  itemTransactions?: Array<{
    itemId: string;
    paymentTransactionId: string;
    transactionStatus: number;
    price: number;
    paidPrice: number;
  }>;
  conversationId: string;
  systemTime: number;
}

// ─── Subscription Domain Types ─────────────────────────────────────────────────

export type SubscriptionPlanId = "starter" | "pro" | "enterprise";

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  nameEn: string;
  description: string;
  price: number; // Monthly price in TRY
  currency: "TRY";
  features: string[];
  limits: {
    conversationsPerMonth: number;
    aiMessagesPerMonth: number;
    properties: number;
    whatsappInstances: number;
  };
  trialDays: number;
  recommended?: boolean;
}

export type SubscriptionStatus =
  | "none"         // No subscription
  | "trial"        // Free trial period
  | "active"       // Active paid subscription
  | "past_due"     // Payment failed, grace period
  | "cancelled"    // User cancelled
  | "expired";     // Subscription expired

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: SubscriptionPlanId;
  status: SubscriptionStatus;
  iyzico_subscription_id?: string;
  current_period_start: string;
  current_period_end: string;
  trial_start?: string;
  trial_end?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TrialInvite {
  id: string;
  code: string;
  plan_id: SubscriptionPlanId;
  trial_days: number;
  used_by_tenant_id?: string;
  used_at?: string;
  expires_at: string;
  created_at: string;
  created_by: string;
}
