"use client";

import * as React from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { SubscriptionStatusCard } from "@/components/subscription/subscription-status";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Shield,
  Gift,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Landmark,
  Copy,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";

type FlowStep = "status" | "trial";

export default function SubscriptionPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => { setIsMounted(true); }, []);

  const [step, setStep] = React.useState<FlowStep>("status");
  const [subStatus, setSubStatus] = React.useState<{
    status: string;
    plan?: string;
    trialEnd?: string;
    currentPeriodEnd?: string;
    message?: string;
    _mock?: boolean;
  } | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(true);

  // Trial state
  const [trialCode, setTrialCode] = React.useState("");
  const [trialLoading, setTrialLoading] = React.useState(false);
  const [trialMessage, setTrialMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // IBAN copy state
  const [ibanCopied, setIbanCopied] = React.useState(false);

  React.useEffect(() => {
    if (!isMounted) return;
    fetchStatus();
  }, [isMounted]);

  async function fetchStatus() {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/subscription/status?tenant_id=demo-tenant");
      if (res.ok) {
        const data = await res.json();
        setSubStatus(data);
      }
    } catch {
      setSubStatus({
        status: "trial",
        plan: "pro",
        trialEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
        message: "Deneme sürümü aktif.",
        _mock: true,
      });
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleTrialActivation() {
    if (!trialCode.trim()) return;

    setTrialLoading(true);
    setTrialMessage(null);

    try {
      await new Promise((r) => setTimeout(r, 1500));

      if (trialCode.toUpperCase() === "BUNGALOV14") {
        setTrialMessage({
          type: "success",
          text: "🎉 Deneme süresi aktif edildi! 14 gün boyunca Profesyonel planın tüm özelliklerini ücretsiz kullanabilirsiniz.",
        });
        setSubStatus({
          status: "trial",
          plan: "pro",
          trialEnd: new Date(Date.now() + 14 * 86400000).toISOString(),
          message: "Deneme sürümü aktif.",
          _mock: true,
        });
      } else {
        setTrialMessage({
          type: "error",
          text: "Geçersiz veya kullanılmış davet kodu. Lütfen kontrol edip tekrar deneyin.",
        });
      }
    } catch {
      setTrialMessage({
        type: "error",
        text: "Sistem hatası. Lütfen tekrar deneyin.",
      });
    } finally {
      setTrialLoading(false);
    }
  }

  const handleCopyIBAN = async () => {
    try {
      await navigator.clipboard.writeText("TR12 0001 2345 6789 0001 0001 23");
      setIbanCopied(true);
      setTimeout(() => setIbanCopied(false), 2000);
    } catch {
      // Fallback
      setIbanCopied(true);
      setTimeout(() => setIbanCopied(false), 2000);
    }
  };

  if (!isMounted) return null;

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-4">
        {/* Page header */}
        <div className="flex items-center gap-2">
          {step !== "status" && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => {
                setStep("status");
                setTrialCode("");
                setTrialMessage(null);
              }}
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <Shield className="size-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Abonelik</h2>
            <p className="text-xs text-muted-foreground">
              Bungalov AI yapay zeka hizmeti aboneliği
            </p>
          </div>
        </div>

        {/* Step: Status Overview */}
        {step === "status" && (
          <>
            {/* Current subscription status */}
            {statusLoading ? (
              <Card size="sm" className="animate-pulse">
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-muted" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-24 rounded bg-muted" />
                      <div className="h-2.5 w-36 rounded bg-muted" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : subStatus ? (
              <SubscriptionStatusCard
                status={subStatus.status as "none" | "trial" | "active" | "past_due" | "cancelled" | "expired"}
                planId={subStatus.plan}
                trialEnd={subStatus.trialEnd}
                currentPeriodEnd={subStatus.currentPeriodEnd}
                isMock={subStatus._mock}
              />
            ) : null}

            {/* IBAN Subscription Info */}
            <Card className="ring-1 ring-primary/10">
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <Landmark className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">IBAN ile Ödeme</p>
                    <p className="text-xs text-muted-foreground">
                      Abonelik ücretinizi havale/EFT ile ödeyebilirsiniz
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Banka Hesabı</p>
                  <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Banka</span>
                      <span className="text-sm font-medium">Ziraat Bankası</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Alıcı Adı</span>
                      <span className="text-sm font-medium">Merman Bungalov İşletmeciliği</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">IBAN</span>
                      <div className="flex items-center gap-1.5">
                        <code className="text-sm font-mono font-medium bg-background px-2 py-0.5 rounded text-[11px]">
                          TR12 0001 2345 6789 0001 0001 23
                        </code>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={handleCopyIBAN}
                          className="size-6 shrink-0"
                          title="Kopyala"
                        >
                          {ibanCopied ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Açıklama</span>
                      <span className="text-xs font-medium text-right max-w-[200px]">
                        İşletme adı + referans kodu
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-400 space-y-1">
                  <p className="font-medium">Ödeme Sonrası</p>
                  <p>Havale yaptıktan sonra ödemeniz manuel olarak onaylanacaktır. Genellikle 1-2 iş günü içinde hesabınıza tanımlanır.</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                    <p className="text-lg font-bold text-primary">₺499</p>
                    <p className="text-muted-foreground mt-0.5">Starter /ay</p>
                  </div>
                  <div className="rounded-lg bg-primary/5 p-2.5 text-center ring-1 ring-primary/20">
                    <p className="text-lg font-bold text-primary">₺999</p>
                    <p className="text-muted-foreground mt-0.5">Pro /ay</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action cards */}
            <div className="grid gap-3">
              {/* Trial activation */}
              <Card
                size="sm"
                className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
                onClick={() => setStep("trial")}
              >
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
                        <Gift className="size-4.5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Davet Kodu Kullan</p>
                        <p className="text-[10px] text-muted-foreground">
                          Ücretsiz deneme süresi için davet kodunuzu girin
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="size-4 text-muted-foreground rotate-180" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Info */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5">
                <Shield className="size-3" />
                <span className="font-medium text-foreground">Abonelik Bilgisi</span>
              </p>
              <p>
                Bungalov AI yapay zeka hizmeti aylık abonelik ile çalışır.
                Ödemeler IBAN havalesi ile alınır, manuel onaylanır.
              </p>
              <p className="mt-1">
                <strong>Not:</strong> Misafir rezervasyon ödemeleri de IBAN/havale ile yapılır.
              </p>
            </div>
          </>
        )}

        {/* Step: Trial Activation */}
        {step === "trial" && (
          <>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Gift className="size-4 text-amber-600" />
                Davet Kodu ile Deneme
              </h3>
              <p className="text-xs text-muted-foreground">
                Satış ekibimizden aldığınız davet kodunu girerek ücretsiz deneme
                sürenizi başlatın. Deneme süresi sonunda otomatik olarak ücret
                alınmaz.
              </p>
            </div>

            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                  <Sparkles className="size-5 text-blue-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium text-blue-800 dark:text-blue-400">
                      Davet kodu ile başlatın
                    </p>
                    <p className="text-blue-700 dark:text-blue-500 mt-0.5">
                      Deneme süresi yalnızca geçerli bir davet kodu ile aktifleştirilir.
                      Kodunuzu satış temsilcinizden alabilirsiniz.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trial-code" className="text-xs">Davet Kodu</Label>
                  <Input
                    id="trial-code"
                    value={trialCode}
                    onChange={(e) => setTrialCode(e.target.value.toUpperCase())}
                    placeholder="örn: BUNGALOV14"
                    className="font-mono text-center tracking-widest uppercase"
                    maxLength={20}
                  />
                </div>

                {trialMessage && (
                  <div
                    className={cn(
                      "flex items-start gap-2 rounded-lg p-3 text-xs",
                      trialMessage.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                    )}
                  >
                    {trialMessage.type === "success" ? (
                      <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    )}
                    <p>{trialMessage.text}</p>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!trialCode.trim() || trialLoading}
                  onClick={handleTrialActivation}
                >
                  {trialLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Kontrol ediliyor…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Denemeyi Başlat
                    </>
                  )}
                </Button>

                {/* Demo hint */}
                <div className="text-center text-[10px] text-muted-foreground">
                  <Badge variant="outline" className="text-[9px]">Demo</Badge>
                  <span className="ml-1.5">
                    Test için &quot;BUNGALOV14&quot; kodunu kullanabilirsiniz
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MobileShell>
  );
}
