"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ClipboardList, ShieldAlert, TimerOff, CreditCard, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

interface OnboardingGateProps {
  children: React.ReactNode;
}

const PROTECTED_PATHS = [
  "/dashboard", "/reservations", "/payments", "/messages",
  "/settings", "/analytics", "/ai", "/subscription",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

const TRIAL_EXEMPT_PATHS = ["/subscription"];

export function OnboardingGate({ children }: OnboardingGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAuthenticated, tenant } = useAuth();
  const supabase = createClient();

  const [subscriptionStatus, setSubscriptionStatus] = React.useState<"loading" | "active" | "trial" | "expired">("loading");

  const onboardingCompleted = tenant?.onboarding_completed ?? false;

  React.useEffect(() => {
    const currentTenantId = tenant?.id;
    if (!currentTenantId) {
      setSubscriptionStatus("active");
      return;
    }

    let cancelled = false;

    async function checkSubscription() {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("status, trial_end")
          .eq("tenant_id", currentTenantId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (cancelled) return;

        if (error || !data) { setSubscriptionStatus("trial"); return; }
        if (data.status === "active") { setSubscriptionStatus("active"); return; }
        if (data.status === "expired" || data.status === "cancelled") { setSubscriptionStatus("expired"); return; }

        if (data.status === "trial" && data.trial_end) {
          setSubscriptionStatus(new Date() > new Date(data.trial_end) ? "expired" : "trial");
          return;
        }
        setSubscriptionStatus("trial");
      } catch { if (!cancelled) setSubscriptionStatus("trial"); }
    }

    checkSubscription();
    return () => { cancelled = true; };
  }, [tenant?.id, supabase]);

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && isProtectedPath(pathname)) {
      router.replace(`/login?reason=unauthorized&redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (isAuthenticated && subscriptionStatus === "expired" && !TRIAL_EXEMPT_PATHS.some((p) => pathname.startsWith(p))) {
      router.replace("/subscription?reason=trial_expired");
      return;
    }
    if (isAuthenticated && !onboardingCompleted && pathname !== "/onboarding") {
      router.replace("/onboarding");
      return;
    }
  }, [isLoading, isAuthenticated, subscriptionStatus, onboardingCompleted, pathname, router]);

  if (isLoading) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Yükleniyor…</p>
    </div>
  );

  if (!isAuthenticated && isProtectedPath(pathname)) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <ShieldAlert className="size-8 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold">Giriş Gerekli</h2>
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
    </div>
  );

  if (!isAuthenticated) return <>{children}</>;

  if (subscriptionStatus === "loading") return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Abonelik kontrol ediliyor…</p>
    </div>
  );

  if (subscriptionStatus === "expired" && !TRIAL_EXEMPT_PATHS.some((p) => pathname.startsWith(p))) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="flex size-20 items-center justify-center rounded-full bg-amber-50">
        <TimerOff className="size-10 text-amber-600" />
      </div>
      <div className="text-center space-y-3 max-w-sm">
        <h2 className="text-xl font-semibold">Deneme Süreniz Doldu</h2>
        <p className="text-sm text-muted-foreground">Devam etmek için bir plan seçin.</p>
      </div>
      <div className="flex gap-3">
        <Link href="/subscription"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          <CreditCard className="size-4" /> Plan Seç
        </Link>
        <Link href="/subscription?reason=expired"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-muted">
          <RefreshCw className="size-4" /> Yeniden Başlat
        </Link>
      </div>
    </div>
  );

  if (!onboardingCompleted && pathname !== "/onboarding") return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <ClipboardList className="size-8 text-primary" />
      </div>
      <h2 className="text-lg font-semibold">Kurulum Gerekli</h2>
      <Loader2 className="size-4 animate-spin text-primary" />
    </div>
  );

  return <>{children}</>;
}
