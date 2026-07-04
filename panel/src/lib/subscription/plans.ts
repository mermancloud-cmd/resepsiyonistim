/**
 * Subscription plan definitions for AI SaaS.
 * IYZICO is ONLY used for these SaaS subscription payments.
 * Guest reservation payments use IBAN/havale (see /payments).
 */

import type { SubscriptionPlan, SubscriptionPlanId } from "@/lib/iyzico/types";

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Başlangıç",
    nameEn: "Starter",
    description: "Küçük tesisler için ideal başlangıç paketi.",
    price: 499,
    currency: "TRY",
    features: [
      "Aylık 500 yapay zeka mesajı",
      "1 tesis",
      "1 WhatsApp numarası",
      "Temel rezervasyon yönetimi",
      "E-posta destek",
    ],
    limits: {
      conversationsPerMonth: 100,
      aiMessagesPerMonth: 500,
      properties: 1,
      whatsappInstances: 1,
    },
    trialDays: 14,
  },
  {
    id: "pro",
    name: "Profesyonel",
    nameEn: "Pro",
    description: "Büyüyen işletmeler için önerilen plan. En popüler seçenek.",
    price: 999,
    currency: "TRY",
    features: [
      "Aylık 5.000 yapay zeka mesajı",
      "5 tesis",
      "3 WhatsApp numarası",
      "Gelişmiş rezervasyon yönetimi",
      "Analitik dashboard",
      "Öncelikli destek",
      "Özel AI persona ayarları",
    ],
    limits: {
      conversationsPerMonth: 1000,
      aiMessagesPerMonth: 5000,
      properties: 5,
      whatsappInstances: 3,
    },
    trialDays: 14,
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Kurumsal",
    nameEn: "Enterprise",
    description: "Çoklu tesis yönetimi ve sınırsız kullanım için.",
    price: 2499,
    currency: "TRY",
    features: [
      "Sınırsız yapay zeka mesajı",
      "Sınırsız tesis",
      "10 WhatsApp numarası",
      "API erişimi",
      "Özel entegrasyonlar",
      "7/24 öncelikli destek",
      "Çoklu dil desteği",
      "Beyaz etiket seçeneği",
    ],
    limits: {
      conversationsPerMonth: -1, // unlimited
      aiMessagesPerMonth: -1,
      properties: -1,
      whatsappInstances: 10,
    },
    trialDays: 30,
  },
];

export function getPlanById(id: SubscriptionPlanId): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id);
}

export function getPlanPrice(id: SubscriptionPlanId): number {
  return getPlanById(id)?.price ?? 0;
}

/**
 * Format plan price for display in Turkish locale.
 */
export function formatPlanPrice(price: number, currency = "TRY"): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
