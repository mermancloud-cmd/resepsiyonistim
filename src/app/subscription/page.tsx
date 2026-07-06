"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = useAuth();
  const supabase = createClient();

  const [subscription, setSubscription] = useState<{
    status: string; trial_end: string | null; plan_id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const reason = searchParams?.get("reason");
  const expiredBanner = reason === "trial_expired" || reason === "expired";

  useEffect(() => {
    const currentTenantId = tenant?.id;
    if (!currentTenantId) { setLoading(false); return; }

    async function load() {
      const { data } = (await supabase
        .from("subscriptions")
        .select("status, trial_end, plan_id")
        .eq("tenant_id", currentTenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()) as PostgrestSingleResponse<{ status: string; trial_end: string | null; plan_id: string }>;

      if (data) setSubscription(data);
      setLoading(false);
    }
    load();
  }, [tenant?.id, supabase]);

  const trialEndDate = subscription?.trial_end
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(subscription.trial_end))
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-semibold">Abonelik</h1>

        {expiredBanner && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-800">Deneme Süreniz Doldu</h2>
            <p className="text-sm text-amber-700">Devam etmek için bir plan seçin.</p>
          </div>
        )}

        {loading && <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />}

        {!loading && subscription && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Mevcut Plan</h2>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold capitalize">{subscription.plan_id}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                subscription.status === "trial" ? "bg-blue-50 text-blue-700" :
                subscription.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}>
                {subscription.status === "trial" ? "Deneme" : subscription.status === "active" ? "Aktif" : "Süresi Doldu"}
              </span>
            </div>
            {trialEndDate && <p className="text-sm text-muted-foreground">Deneme bitiş: <span className="font-medium">{trialEndDate}</span></p>}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-lg font-semibold">Başlangıç</h3>
            <p className="text-3xl font-bold">₺499<span className="text-sm font-normal text-muted-foreground">/ay</span></p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Aylık 500 AI mesajı</li>
              <li>✓ 1 tesis</li>
              <li>✓ 1 WhatsApp numarası</li>
            </ul>
            <span className="block w-full text-center border border-border px-4 py-2.5 rounded-lg text-sm text-muted-foreground">Yakında</span>
          </div>
          <div className="rounded-xl border-2 border-amber-500 bg-card p-6 space-y-4 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full">En Popüler</div>
            <h3 className="text-lg font-semibold">Profesyonel</h3>
            <p className="text-3xl font-bold">₺999<span className="text-sm font-normal text-muted-foreground">/ay</span></p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Aylık 5.000 AI mesajı</li>
              <li>✓ 5 tesis</li>
              <li>✓ 3 WhatsApp numarası</li>
              <li>✓ Gelişmiş analitik</li>
            </ul>
            <span className="block w-full text-center bg-foreground text-background px-4 py-2.5 rounded-lg text-sm opacity-60">Yakında</span>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">İyzico entegrasyonu hazırlanıyor.</p>

        <div className="text-center">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Panele Dön</Link>
        </div>
      </div>
    </div>
  );
}
