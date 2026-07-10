"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import {
  SUBSCRIPTION_PLANS,
  formatPlanPrice,
} from "@/lib/subscription/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentNotificationForm } from "@/components/subscription/payment-notification-form";
import {
  Check,
  Star,
  Zap,
  ShieldCheck,
  Clock,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import type { SubscriptionPlanId } from "@/lib/subscription/types";

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = useAuth();
  const supabase = createClient();

  const [subscription, setSubscription] = useState<{
    status: string;
    trial_end: string | null;
    plan_id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId | null>(null);
  const [showIbanInfo, setShowIbanInfo] = useState(false);

  const reason = searchParams?.get("reason");
  const expiredBanner = reason === "trial_expired" || reason === "expired";

  useEffect(() => {
    const currentTenantId = tenant?.id;
    if (!currentTenantId) {
      setLoading(false);
      return;
    }

    async function load() {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, trial_end, plan_id")
        .eq("tenant_id", currentTenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) setSubscription(data);
      setLoading(false);
    }
    load();
  }, [tenant?.id, supabase]);

  const trialEndDate = subscription?.trial_end
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(
        new Date(subscription.trial_end)
      )
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Abonelik Planları
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            14 gün ücretsiz deneyin, sonra ihtiyacınıza uygun plana geçin.
            İstediğiniz zaman iptal edebilirsiniz.
          </p>
        </div>

        {/* Trial banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/10 dark:border-amber-800 p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-800 dark:text-amber-300 mb-2">
            <Clock className="size-5" />
            <span className="font-semibold text-lg">
              14 Gün Ücretsiz Deneme
            </span>
          </div>
          <p className="text-amber-700 dark:text-amber-400 text-sm max-w-xl mx-auto">
            Hiçbir kart bilgisi gerekmez. Deneme süresi boyunca tüm özellikler
            açıktır. Süre sonunda istediğiniz plana geçebilir veya ücretsiz
            kullanıma devam edebilirsiniz.
          </p>
        </div>

        {expiredBanner && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-800">
              Deneme Süreniz Doldu
            </h2>
            <p className="text-sm text-amber-700">
              Devam etmek için bir plan seçin.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && subscription && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Mevcut Plan</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold capitalize">
                    {subscription.plan_id === "starter"
                      ? "Başlangıç"
                      : subscription.plan_id === "pro"
                      ? "Profesyonel"
                      : subscription.plan_id === "business"
                      ? "İşletme"
                      : subscription.plan_id === "enterprise"
                      ? "Kurumsal"
                      : subscription.plan_id}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      subscription.status === "trial"
                        ? "bg-blue-50 text-blue-700"
                        : subscription.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {subscription.status === "trial"
                      ? "Deneme"
                      : subscription.status === "active"
                      ? "Aktif"
                      : "Süresi Doldu"}
                  </span>
                </div>
              </div>
              {trialEndDate && (
                <p className="text-sm text-muted-foreground">
                  Deneme bitiş:{" "}
                  <span className="font-medium">{trialEndDate}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-6 space-y-4 relative transition-all ${
                  plan.recommended
                    ? "border-2 border-amber-500 shadow-lg shadow-amber-200/30"
                    : "border-border hover:border-amber-200 hover:shadow-md"
                } ${
                  isSelected
                    ? "ring-2 ring-primary"
                    : ""
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full whitespace-nowrap">
                    ⭐ En Popüler
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {plan.recommended && (
                      <Star className="size-4 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                </div>

                <div>
                  <p className="text-3xl font-bold">
                    {formatPlanPrice(plan.price)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /ay
                    </span>
                  </p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    ✨ {plan.trialDays} gün ücretsiz dene
                  </p>
                </div>

                {/* Limits */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">
                    <Zap className="size-2.5 mr-1" />
                    {plan.limits.aiMessagesPerMonth === -1
                      ? "Sınırsız"
                      : plan.limits.aiMessagesPerMonth.toLocaleString("tr-TR")}{" "}
                    mesaj
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {plan.limits.properties === -1
                      ? "Sınırsız"
                      : plan.limits.properties}{" "}
                    tesis
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {plan.limits.whatsappInstances} no.
                  </Badge>
                </div>

                {/* Features */}
                <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                  {plan.features.slice(0, 6).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.features.length > 6 && (
                    <li className="text-xs text-muted-foreground pl-6">
                      +{plan.features.length - 6} özellik daha…
                    </li>
                  )}
                </ul>

                {/* CTA */}
                <Button
                  variant={plan.recommended ? "default" : "outline"}
                  className="w-full"
                  onClick={() => {
                    setSelectedPlan(plan.id);
                    setShowIbanInfo(true);
                  }}
                >
                  {plan === SUBSCRIPTION_PLANS[0]
                    ? "Ücretsiz Dene"
                    : "Bu Planı Seç"}
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* IBAN Payment Info */}
        {showIbanInfo && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/10 dark:border-emerald-800 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" />
              <h3 className="font-semibold text-lg">Havale / EFT ile Ödeme</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Seçtiğiniz planı aşağıdaki IBAN numarasına havale/EFT yaparak
              aktifleştirebilirsiniz. Ödemeniz onaylandıktan sonra hesabınız
              otomatik olarak güncellenir.
            </p>

            <div className="bg-white dark:bg-card rounded-lg p-4 border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Banka</span>
                <span className="font-medium">Türkiye İş Bankası</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IBAN</span>
                <span className="font-medium font-mono text-base tracking-wider">
                  TR86 0006 4000 0011 0000 1234 56
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Alıcı Adı</span>
                <span className="font-medium">Merman Bilişim Teknolojileri</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Açıklama</span>
                <span className="font-medium font-mono text-xs">
                  [İşletme Adınız] - Abonelik
                </span>
              </div>
              {selectedPlan && (
                <div className="flex justify-between text-sm pt-2 border-t mt-2">
                  <span className="text-muted-foreground">Tutar</span>
                  <span className="font-bold text-lg">
                    {formatPlanPrice(
                      SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan)
                        ?.price ?? 0
                    )}
                    <span className="text-xs font-normal text-muted-foreground">
                      /ay
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <HelpCircle className="size-3 mt-0.5 shrink-0" />
              <p>
                Ödemeniz yapıldıktan sonra panel üzerinden dekontu yükleyebilir
                veya destek ekibimize WhatsApp üzerinden iletebilirsiniz.
                Ödeme onayı genellikle 1-2 saat içinde yapılır.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="default"
                className="flex-1"
                onClick={() =>
                  window.open(
                    `https://wa.me/905427450654?text=${encodeURIComponent(
                      `${SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan)?.name} planı için ödeme yaptım.`
                    )}`,
                    "_blank"
                  )
                }
              >
                WhatsApp ile Bildir
                <ChevronRight className="size-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowIbanInfo(false)}
              >
                Vazgeç
              </Button>
            </div>
          </div>
        )}

        {/* Payment Notification Form */}
        {showIbanInfo && selectedPlan && tenant?.id && (
          <div className="rounded-xl border border-border bg-card p-6">
            <PaymentNotificationForm
              tenantId={tenant.id}
              planId={selectedPlan}
              amount={
                SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan)?.price ??
                0
              }
            />
          </div>
        )}

        {/* FAQ */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Sıkça Sorulan Sorular</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1">
              <p className="font-medium">Deneme süresi nasıl işler?</p>
              <p className="text-muted-foreground">
                Kaydolduğunuzda otomatik olarak 14 günlük ücretsiz deneme
                başlar. Tüm özellikler açıktır. Süre sonunda herhangi bir plan
                seçmezseniz hesabınız temel özelliklerle sınırlanır.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">İptal edebilir miyim?</p>
              <p className="text-muted-foreground">
                Evet, istediğiniz zaman iptal edebilirsiniz. İptal sonrası
                mevcut fatura döneminin sonuna kadar hizmet devam eder.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Hangi ödeme yöntemleri var?</p>
              <p className="text-muted-foreground">
                Şu anda havale/EFT ile ödeme alıyoruz. Hesap hareketlerinizi
                panelden takip edebilirsiniz.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Yıllık indirim var mı?</p>
              <p className="text-muted-foreground">
                Yıllık ödemede %15 indirim uygulanır. Detaylı bilgi için
                WhatsApp üzerinden iletişime geçebilirsiniz.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Panele Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
