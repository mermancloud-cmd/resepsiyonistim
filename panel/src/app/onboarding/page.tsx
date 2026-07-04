"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  PartyPopper,
  Sparkles,
  Rocket,
  Loader2,
  LayoutDashboard,
  Save,
  AlertTriangle,
} from "lucide-react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { StepBusinessInfo } from "@/components/onboarding/step-business-info";
import { StepLocation } from "@/components/onboarding/step-location";
import { StepUnits } from "@/components/onboarding/step-units";
import { StepPricing } from "@/components/onboarding/step-pricing";
import { StepAmenities } from "@/components/onboarding/step-amenities";
import { StepRules } from "@/components/onboarding/step-rules";
import { StepCancellation } from "@/components/onboarding/step-cancellation";
import { StepDepositPayment } from "@/components/onboarding/step-deposit-payment";
import { StepSurroundings } from "@/components/onboarding/step-surroundings";
import { StepEmergency } from "@/components/onboarding/step-emergency";
import { StepGreeting } from "@/components/onboarding/step-greeting";
import { StepReview } from "@/components/onboarding/step-review";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useOnboarding } from "@/hooks/use-onboarding";
import { validateStep } from "@/lib/onboarding/validation";
import {
  DEFAULT_ONBOARDING_DATA,
  STEP_LABELS,
  type OnboardingData,
  type BusinessInfoData,
  type LocationData,
  type UnitData,
  type PricingData,
  type AmenitiesData,
  type RulesData,
  type CancellationData,
  type DepositPaymentData,
  type SurroundingsData,
  type EmergencyData,
  type GreetingData,
} from "@/lib/onboarding/types";

const TOTAL_STEPS = 12;

function OnboardingWizard() {
  const router = useRouter();
  const [isMounted, setIsMounted] = React.useState(false);

  const [currentStep, setCurrentStep] = React.useState(1);
  const [isActivated, setIsActivated] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);
  const [hasResumed, setHasResumed] = React.useState(false);

  const {
    stepStatuses,
    isLoading,
    isInitializing,
    error,
    completedCount,
    allComplete,
    savedProgress,
    lastCompletedStep,
    completeStep,
    activateBusiness,
  } = useOnboarding();

  const [data, setData] = React.useState<OnboardingData>(() => ({
    ...DEFAULT_ONBOARDING_DATA,
    business: { ...DEFAULT_ONBOARDING_DATA.business },
    location: { ...DEFAULT_ONBOARDING_DATA.location },
    units: DEFAULT_ONBOARDING_DATA.units.map((u) => ({ ...u, amenities: [...u.amenities] })),
    pricing: { ...DEFAULT_ONBOARDING_DATA.pricing, seasonalAdjustments: [] },
    amenities: { ...DEFAULT_ONBOARDING_DATA.amenities },
    rules: { ...DEFAULT_ONBOARDING_DATA.rules },
    cancellation: {
      ...DEFAULT_ONBOARDING_DATA.cancellation,
      refundPercentages: DEFAULT_ONBOARDING_DATA.cancellation.refundPercentages.map((r) => ({ ...r })),
    },
    depositPayment: { ...DEFAULT_ONBOARDING_DATA.depositPayment, paymentMethods: [...DEFAULT_ONBOARDING_DATA.depositPayment.paymentMethods] },
    surroundings: { ...DEFAULT_ONBOARDING_DATA.surroundings },
    emergency: { ...DEFAULT_ONBOARDING_DATA.emergency },
    greeting: { ...DEFAULT_ONBOARDING_DATA.greeting },
  }));

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Restore saved progress data when initialization completes
  React.useEffect(() => {
    if (isInitializing || hasResumed) return;
    if (!savedProgress || Object.keys(savedProgress).length === 0) {
      setHasResumed(true);
      return;
    }

    setData((prev) => {
      const restored = { ...prev };

      // Step 1: Business Info
      if (savedProgress[1]) {
        restored.business = { ...prev.business, ...(savedProgress[1] as Partial<BusinessInfoData>) };
      }
      // Step 2: Location
      if (savedProgress[2]) {
        restored.location = { ...prev.location, ...(savedProgress[2] as Partial<LocationData>) };
      }
      // Step 3: Units
      if (savedProgress[3] && typeof savedProgress[3] === "object" && "units" in savedProgress[3]) {
        const unitsData = savedProgress[3] as { units?: UnitData[] };
        if (Array.isArray(unitsData.units) && unitsData.units.length > 0) {
          restored.units = unitsData.units;
        }
      }
      // Step 4: Pricing
      if (savedProgress[4]) {
        restored.pricing = { ...prev.pricing, ...(savedProgress[4] as Partial<PricingData>) };
      }
      // Step 5: Amenities
      if (savedProgress[5]) {
        restored.amenities = { ...prev.amenities, ...(savedProgress[5] as Partial<AmenitiesData>) };
      }
      // Step 6: Rules
      if (savedProgress[6]) {
        restored.rules = { ...prev.rules, ...(savedProgress[6] as Partial<RulesData>) };
      }
      // Step 7: Cancellation
      if (savedProgress[7]) {
        restored.cancellation = {
          ...prev.cancellation,
          ...(savedProgress[7] as Partial<CancellationData>),
        };
      }
      // Step 8: Deposit/Payment
      if (savedProgress[8]) {
        restored.depositPayment = {
          ...prev.depositPayment,
          ...(savedProgress[8] as Partial<DepositPaymentData>),
        };
      }
      // Step 9: Surroundings
      if (savedProgress[9]) {
        restored.surroundings = { ...prev.surroundings, ...(savedProgress[9] as Partial<SurroundingsData>) };
      }
      // Step 10: Emergency
      if (savedProgress[10]) {
        restored.emergency = { ...prev.emergency, ...(savedProgress[10] as Partial<EmergencyData>) };
      }
      // Step 11: Greeting
      if (savedProgress[11]) {
        restored.greeting = { ...prev.greeting, ...(savedProgress[11] as Partial<GreetingData>) };
      }

      return restored;
    });

    // Resume from the next uncompleted step
    if (lastCompletedStep > 0 && lastCompletedStep < TOTAL_STEPS) {
      setCurrentStep(lastCompletedStep + 1);
    }

    setHasResumed(true);
  }, [isInitializing, savedProgress, lastCompletedStep, hasResumed]);

  // Step data getters/setters
  function updateBusiness(business: BusinessInfoData) {
    setData((prev) => ({ ...prev, business }));
  }

  function updateLocation(location: LocationData) {
    setData((prev) => ({ ...prev, location }));
  }

  function updateUnits(units: UnitData[]) {
    setData((prev) => ({ ...prev, units }));
  }

  function updatePricing(pricing: PricingData) {
    setData((prev) => ({ ...prev, pricing }));
  }

  function updateAmenities(amenities: AmenitiesData) {
    setData((prev) => ({ ...prev, amenities }));
  }

  function updateRules(rules: RulesData) {
    setData((prev) => ({ ...prev, rules }));
  }

  function updateCancellation(cancellation: CancellationData) {
    setData((prev) => ({ ...prev, cancellation }));
  }

  function updateDepositPayment(depositPayment: DepositPaymentData) {
    setData((prev) => ({ ...prev, depositPayment }));
  }

  function updateSurroundings(surroundings: SurroundingsData) {
    setData((prev) => ({ ...prev, surroundings }));
  }

  function updateEmergency(emergency: EmergencyData) {
    setData((prev) => ({ ...prev, emergency }));
  }

  function updateGreeting(greeting: GreetingData) {
    setData((prev) => ({ ...prev, greeting }));
  }

  // Get step data for saving
  function getStepData(step: number): Record<string, unknown> {
    switch (step) {
      case 1: return data.business as unknown as Record<string, unknown>;
      case 2: return data.location as unknown as Record<string, unknown>;
      case 3: return { units: data.units } as unknown as Record<string, unknown>;
      case 4: return data.pricing as unknown as Record<string, unknown>;
      case 5: return data.amenities as unknown as Record<string, unknown>;
      case 6: return data.rules as unknown as Record<string, unknown>;
      case 7: return data.cancellation as unknown as Record<string, unknown>;
      case 8: return data.depositPayment as unknown as Record<string, unknown>;
      case 9: return data.surroundings as unknown as Record<string, unknown>;
      case 10: return data.emergency as unknown as Record<string, unknown>;
      case 11: return data.greeting as unknown as Record<string, unknown>;
      default: return {};
    }
  }

  async function saveAndNext() {
    // Clear previous validation errors
    setValidationErrors([]);

    // Validate current step before saving
    const stepData = getStepData(currentStep);
    const validation = validateStep(currentStep, stepData);

    if (!validation.valid) {
      setValidationErrors(validation.errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Save current step via API
    await completeStep(currentStep, stepData);

    // Brief success feedback
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1500);

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goBack() {
    setValidationErrors([]);
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goToStep(step: number) {
    setValidationErrors([]);
    // Binary gate: only allow navigation to completed steps or the next uncompleted step
    const maxAllowed = Math.max(
      1,
      ...stepStatuses.filter((s) => s.completed).map((s) => s.stepNumber),
      0
    ) + 1;

    if (step <= maxAllowed) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleActivate() {
    const success = await activateBusiness();
    if (success) {
      setIsActivated(true);
    }
  }

  if (!isMounted || isInitializing) {
    return (
      <MobileShell hideNav>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Yükleniyor…</p>
        </div>
      </MobileShell>
    );
  }

  // Activated success screen
  if (isActivated) {
    return (
      <MobileShell hideNav>
        <div className="flex flex-col gap-5 pb-8">
          <div className="flex flex-col items-center text-center py-6 space-y-3">
            <div className="relative">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50 dark:bg-emerald-900/30 dark:ring-emerald-900/20">
                <PartyPopper className="size-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 size-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">İşletmeniz Yayında!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kurulum başarıyla tamamlandı. Artık rezervasyon almaya hazırsınız.
              </p>
            </div>
          </div>

          <Card size="sm" className="bg-emerald-50 dark:bg-emerald-950/20 ring-emerald-200 dark:ring-emerald-800">
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {data.business.businessName || "İşletmeniz"} aktif ve misafirleri karşılamaya hazır.
                </span>
              </div>
            </CardContent>
          </Card>

          <Button size="lg" className="w-full" onClick={() => router.push("/dashboard")}>
            <LayoutDashboard className="size-4" />
            Gösterge Paneline Git
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Tüm ayarları daha sonra Ayarlar sayfasından değiştirebilirsiniz.
          </p>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell hideNav>
      <div className="flex flex-col gap-5 pb-8">
        {/* Error display */}
        {error && (
          <Card size="sm" className="bg-destructive/10 ring-destructive/20">
            <CardContent>
              <p className="text-xs text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <Card size="sm" className="bg-amber-50 dark:bg-amber-950/20 ring-amber-200 dark:ring-amber-800">
            <CardContent>
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    Lütfen aşağıdaki hataları düzeltin:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {validationErrors.map((err, i) => (
                      <li key={i} className="text-[11px] text-amber-700 dark:text-amber-400">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save success toast */}
        {saveSuccess && (
          <Card size="sm" className="bg-emerald-50 dark:bg-emerald-950/20 ring-emerald-200 dark:ring-emerald-800">
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Adım kaydedildi!
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <OnboardingProgress currentStep={currentStep} />

        {/* Step content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <StepBusinessInfo data={data.business} onChange={updateBusiness} />
          )}
          {currentStep === 2 && (
            <StepLocation data={data.location} onChange={updateLocation} />
          )}
          {currentStep === 3 && (
            <StepUnits data={data.units} onChange={updateUnits} />
          )}
          {currentStep === 4 && (
            <StepPricing data={data.pricing} onChange={updatePricing} />
          )}
          {currentStep === 5 && (
            <StepAmenities data={data.amenities} onChange={updateAmenities} />
          )}
          {currentStep === 6 && (
            <StepRules data={data.rules} onChange={updateRules} />
          )}
          {currentStep === 7 && (
            <StepCancellation data={data.cancellation} onChange={updateCancellation} />
          )}
          {currentStep === 8 && (
            <StepDepositPayment data={data.depositPayment} onChange={updateDepositPayment} />
          )}
          {currentStep === 9 && (
            <StepSurroundings data={data.surroundings} onChange={updateSurroundings} />
          )}
          {currentStep === 10 && (
            <StepEmergency data={data.emergency} onChange={updateEmergency} />
          )}
          {currentStep === 11 && (
            <StepGreeting data={data.greeting} onChange={updateGreeting} />
          )}
          {currentStep === 12 && (
            <StepReview data={data} stepStatuses={stepStatuses} />
          )}
        </div>

        <Separator />

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={goBack}
            disabled={currentStep === 1}
            className={cn(currentStep === 1 && "invisible")}
          >
            <ArrowLeft className="size-4" />
            Geri
          </Button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const stepNum = i + 1;
              const isCompleted = stepStatuses.find((s) => s.stepNumber === stepNum)?.completed;
              const maxAllowed = Math.max(
                1,
                ...stepStatuses.filter((s) => s.completed).map((s) => s.stepNumber),
                0
              ) + 1;
              const isLocked = stepNum > maxAllowed;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToStep(stepNum)}
                  disabled={isLocked}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    stepNum === currentStep
                      ? "w-6 bg-primary"
                      : isCompleted
                        ? "w-1.5 bg-emerald-500 cursor-pointer"
                        : isLocked
                          ? "w-1.5 bg-muted-foreground/10 cursor-not-allowed"
                          : "w-1.5 bg-muted-foreground/20 cursor-pointer hover:bg-muted-foreground/40"
                  )}
                  title={isLocked ? `${STEP_LABELS[i]} (kilitli)` : STEP_LABELS[i]}
                />
              );
            })}
          </div>

          {currentStep < TOTAL_STEPS ? (
            <Button size="lg" onClick={saveAndNext} disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="size-4 animate-spin" />Kaydediliyor...</>
              ) : (
                <>İleri<ArrowRight className="size-4" /></>
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleActivate}
              disabled={!allComplete || isLoading}
              className={cn(
                allComplete && "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {isLoading ? (
                <><Loader2 className="size-4 animate-spin" />Aktifleştiriliyor...</>
              ) : (
                <><Rocket className="size-4" />Yayınla</>
              )}
            </Button>
          )}
        </div>

        {/* Step label */}
        <div className="flex items-center justify-center gap-2">
          {currentStep <= TOTAL_STEPS && (
            <p className="text-center text-[11px] text-muted-foreground">
              Adım {currentStep} / {TOTAL_STEPS}
              <span className="ml-1 font-medium text-foreground">
                {STEP_LABELS[currentStep - 1]}
              </span>
            </p>
          )}
          {completedCount > 0 && completedCount < 12 && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Save className="size-3" />
              {completedCount} adım tamamlandı
            </p>
          )}
        </div>

        {!allComplete && currentStep === TOTAL_STEPS && (
          <p className="text-center text-[11px] text-amber-600 dark:text-amber-400">
            Yayınlamak için tüm {12 - completedCount} eksik adımı geri dönüp tamamlayın.
          </p>
        )}
      </div>
    </MobileShell>
  );
}

export default function OnboardingPage() {
  return (
    <React.Suspense
      fallback={
        <MobileShell hideNav>
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Yükleniyor…</p>
          </div>
        </MobileShell>
      }
    >
      <OnboardingWizard />
    </React.Suspense>
  );
}
