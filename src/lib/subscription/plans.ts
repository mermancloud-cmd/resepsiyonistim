/**
 * Subscription plan definitions for AI SaaS.
 * IYZICO is ONLY used for these SaaS subscription payments.
 * Guest reservation payments use IBAN/havale (see /payments).
 */

import type { SubscriptionPlan, SubscriptionPlanId } from "@/lib/iyzico/types";

/**
 * Pazar araştırması ve rakip analizine dayalı fiyatlandırma (Temmuz 2026):
 *
 * Rakip referansları:
 * - Winnobot WhatsApp Core: 7.499 ₺/ay (genel amaçlı chatbot)
 * - Bungalov360: 8.900-21.900 ₺/yıl (PMS, AI asistan yok)
 * - Bir resepsiyonist maaşı: ~20.000-30.000 ₺/ay
 *
 * Strateji: Personel maliyetinin %7-10'una denk gelen Pro paketi tatlı nokta.
 * Starter düşük giriş bariyeri, Business/Enterprise ölçeklenen işletmeler için.
 *
 * ~> Yıllık ödemede %15 indirim uygulanır (uygulamada frontend'de hesaplanır).
 */

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Başlangıç",
    nameEn: "Starter",
    description: "Tek tesislik küçük işletmeler için ideal giriş paketi.",
    price: 999,
    currency: "TRY",
    features: [
      "Aylık 1.000 dijital mesaj",
      "1 tesis",
      "1 WhatsApp numarası",
      "Otomatik bilgi yanıtı",
      "Rezervasyon alma (manuel onay)",
      "Panel erişimi",
      "E-posta destek",
    ],
    limits: {
      conversationsPerMonth: 500,
      aiMessagesPerMonth: 1000,
      properties: 1,
      whatsappInstances: 1,
    },
    trialDays: 14,
  },
  {
    id: "pro",
    name: "Profesyonel",
    nameEn: "Pro",
    description: "Büyüyen işletmeler için en çok tercih edilen paket. ★ Önerilen",
    price: 1999,
    currency: "TRY",
    features: [
      "Aylık 5.000 dijital mesaj",
      "3 tesis",
      "3 WhatsApp numarası",
      "Otomatik rezervasyon (takvim senkronizasyonu)",
      "Çoklu dil desteği (Türkçe + İngilizce + Rusça)",
      "Detaylı raporlar ve analitik",
      "Müşteri CRM",
      "WhatsApp + e-posta destek",
    ],
    limits: {
      conversationsPerMonth: 3000,
      aiMessagesPerMonth: 5000,
      properties: 3,
      whatsappInstances: 3,
    },
    trialDays: 14,
    recommended: true,
  },
  {
    id: "business",
    name: "İşletme",
    nameEn: "Business",
    description: "Birden çok tesisi tek panelden yöneten işletmeler için.",
    price: 3999,
    currency: "TRY",
    features: [
      "Aylık 10.000 dijital mesaj",
      "10 tesis",
      "5 WhatsApp numarası",
      "Otomatik rezervasyon",
      "Çoklu dil (tüm diller)",
      "Kanal yöneticisi entegrasyonu",
      "Fatura oluşturma",
      "API erişimi",
      "Öncelikli 7/24 destek (1 saat yanıt)",
    ],
    limits: {
      conversationsPerMonth: 8000,
      aiMessagesPerMonth: 10000,
      properties: 10,
      whatsappInstances: 5,
    },
    trialDays: 14,
  },
  {
    id: "enterprise",
    name: "Kurumsal",
    nameEn: "Enterprise",
    description: "Sınırsız kullanım ve özel çözümler için.",
    price: 7999,
    currency: "TRY",
    features: [
      "Sınırsız dijital mesaj",
      "Sınırsız tesis",
      "10 WhatsApp numarası",
      "Özel AI eğitimi (işletmeye özel)",
      "Beyaz etiket seçeneği",
      "Özel entegrasyonlar",
      "SLA garantisi (%99.9 uptime)",
      "Özel hesap yöneticisi",
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
