"use client";

import * as React from "react";
import {
  Building2,
  MapPin,
  Home,
  Banknote,
  Star,
  BookOpen,
  ShieldCheck,
  Landmark,
  Trees,
  Phone,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { OnboardingData, OnboardingStepStatus } from "@/lib/onboarding/types";

interface StepReviewProps {
  data: OnboardingData;
  stepStatuses: OnboardingStepStatus[];
}

interface ReviewSectionProps {
  icon: React.ElementType;
  stepNumber: number;
  label: string;
  completed: boolean;
  children: React.ReactNode;
}

function ReviewSection({ icon: Icon, stepNumber, label, completed, children }: ReviewSectionProps) {
  return (
    <Card size="sm" className={cn(!completed && "ring-1 ring-amber-300 dark:ring-amber-700")}>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            completed ? "bg-primary/10" : "bg-amber-100 dark:bg-amber-900/30"
          )}>
            <Icon className={cn(
              "size-4",
              completed ? "text-primary" : "text-amber-600 dark:text-amber-400"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{label}</p>
              <span className="text-[10px] text-muted-foreground">(Adım {stepNumber})</span>
            </div>
            <div className="mt-1">{children}</div>
          </div>
          {completed ? (
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="size-4 text-amber-500 shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StepReview({ data, stepStatuses }: StepReviewProps) {
  const completedCount = stepStatuses.filter((s) => s.completed).length;
  const allComplete = completedCount === 12;

  const isStepComplete = (n: number) =>
    stepStatuses.find((s) => s.stepNumber === n)?.completed ?? false;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Onay ve Yayınla</h3>
        <p className="text-xs text-muted-foreground">
          Girdiğiniz tüm bilgileri gözden geçirin. Tüm adımlar tamamlandığında işletmenizi yayına alabilirsiniz.
        </p>
      </div>

      {/* Progress summary */}
      <Card size="sm" className={cn(
        allComplete
          ? "bg-emerald-50 dark:bg-emerald-950/20 ring-emerald-200 dark:ring-emerald-800"
          : "bg-amber-50 dark:bg-amber-950/20 ring-amber-200 dark:ring-amber-800"
      )}>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex size-10 items-center justify-center rounded-full",
              allComplete ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-amber-100 dark:bg-amber-900/40"
            )}>
              <span className={cn(
                "text-lg font-bold",
                allComplete ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
              )}>
                {completedCount}
              </span>
            </div>
            <div>
              <p className={cn(
                "text-sm font-semibold",
                allComplete ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"
              )}>
                {allComplete ? "Tüm adımlar tamamlandı!" : `${12 - completedCount} adım eksik`}
              </p>
              <p className={cn(
                "text-[11px]",
                allComplete ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
              )}>
                {allComplete
                  ? "İşletmenizi yayına alabilirsiniz."
                  : "Yayınlamak için tüm adımları tamamlayın."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Review sections */}
      <div className="space-y-2">
        <ReviewSection
          icon={Building2}
          stepNumber={1}
          label="İşletme Bilgileri"
          completed={isStepComplete(1)}
        >
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground">
              {data.business.businessName || "Belirtilmedi"} · {data.business.city || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground/80">
              {data.business.businessType === "bungalow" ? "Bungalov" :
               data.business.businessType === "tiny_house" ? "Tiny House" :
               data.business.businessType === "villa" ? "Villa" :
               data.business.businessType === "hotel" ? "Otel" :
               data.business.businessType === "pension" ? "Pansiyon" : "Apart"}
              {data.business.whatsappNumber ? ` · WhatsApp: ${data.business.whatsappNumber}` : " · WhatsApp eksik"}
            </p>
          </div>
        </ReviewSection>

        <ReviewSection
          icon={MapPin}
          stepNumber={2}
          label="Konum ve Ulaşım"
          completed={isStepComplete(2)}
        >
          <p className="text-[11px] text-muted-foreground">
            {data.location.latitude ? `${data.location.latitude.toFixed(4)}, ${data.location.longitude?.toFixed(4)}` : "Koordinat girilmedi"}
          </p>
        </ReviewSection>

        <ReviewSection
          icon={Home}
          stepNumber={3}
          label="Birim Tipleri"
          completed={isStepComplete(3)}
        >
          <p className="text-[11px] text-muted-foreground">
            {data.units.length} birim · {data.units.filter((u) => u.name).map((u) => u.name).join(", ") || "İsimsiz"}
          </p>
        </ReviewSection>

        <ReviewSection
          icon={Banknote}
          stepNumber={4}
          label="Fiyatlandırma"
          completed={isStepComplete(4)}
        >
          <p className="text-[11px] text-muted-foreground">
            {data.pricing.currency} · Min. {data.pricing.minimumStayNights} gece
          </p>
        </ReviewSection>

        <ReviewSection
          icon={Star}
          stepNumber={5}
          label="Özel Özellikler"
          completed={isStepComplete(5)}
        >
          <p className="text-[11px] text-muted-foreground">
            {Object.values(data.amenities).filter(Boolean).length} özellik seçili
          </p>
        </ReviewSection>

        <ReviewSection
          icon={BookOpen}
          stepNumber={6}
          label="Kurallar"
          completed={isStepComplete(6)}
        >
          <p className="text-[11px] text-muted-foreground">
            Giriş {data.rules.checkInTime} · Çıkış {data.rules.checkOutTime}
          </p>
        </ReviewSection>

        <ReviewSection
          icon={ShieldCheck}
          stepNumber={7}
          label="İptal Politikası"
          completed={isStepComplete(7)}
        >
          <p className="text-[11px] text-muted-foreground">
            {data.cancellation.policyType === "flexible" ? "Esnek" :
             data.cancellation.policyType === "moderate" ? "Orta" :
             data.cancellation.policyType === "strict" ? "Sıkı" : "Özel"} · {data.cancellation.freeCancellationDays} gün ücretsiz iptal
          </p>
        </ReviewSection>

        <ReviewSection
          icon={Landmark}
          stepNumber={8}
          label="Depozito ve Ödeme"
          completed={isStepComplete(8)}
        >
          <p className="text-[11px] text-muted-foreground">
            {data.depositPayment.depositType === "percentage"
              ? `%${data.depositPayment.depositPercentage} ön ödeme`
              : `₺${data.depositPayment.depositFixedAmount} sabit depozito`}
            {data.depositPayment.iban ? " · IBAN girildi" : " · IBAN eksik"}
          </p>
        </ReviewSection>

        <ReviewSection
          icon={Trees}
          stepNumber={9}
          label="Çevre Bilgileri"
          completed={isStepComplete(9)}
        >
          <p className="text-[11px] text-muted-foreground">
            {data.surroundings.nearbyMarkets || data.surroundings.nearbyAttractions
              ? "Bilgiler girildi"
              : "Henüz bilgi girilmedi"}
          </p>
        </ReviewSection>

        <ReviewSection
          icon={Phone}
          stepNumber={10}
          label="Acil Durum"
          completed={isStepComplete(10)}
        >
          <p className="text-[11px] text-muted-foreground">
            {data.emergency.emergencyContactPhone
              ? `${data.emergency.emergencyContactName || "Kişi"}: ${data.emergency.emergencyContactPhone}`
              : "Henüz girilmedi"}
          </p>
        </ReviewSection>

        <ReviewSection
          icon={Sparkles}
          stepNumber={11}
          label="Kişisel Karşılama"
          completed={isStepComplete(11)}
        >
          <p className="text-[11px] text-muted-foreground">
            {data.greeting.personaName} · {data.greeting.personaTone === "formal" ? "Resmi" : data.greeting.personaTone === "friendly" ? "Samimi" : "İçten"}
          </p>
        </ReviewSection>
      </div>
    </div>
  );
}
