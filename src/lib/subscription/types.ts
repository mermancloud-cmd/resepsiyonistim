/**
 * Subscription domain types for Resepsiyonistim SaaS.
 */

export type SubscriptionPlanId = "starter" | "pro" | "business" | "enterprise";

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
