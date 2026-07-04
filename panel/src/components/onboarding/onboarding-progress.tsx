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
  Rocket,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_LABELS } from "@/lib/onboarding/types";

interface OnboardingProgressProps {
  currentStep: number; // 1-12, or 13 for complete
  totalSteps?: number;
}

const STEP_ICONS = [
  Building2, MapPin, Home, Banknote, Star, BookOpen,
  ShieldCheck, Landmark, Trees, Phone, Sparkles, Rocket,
];

export function OnboardingProgress({ currentStep, totalSteps = 12 }: OnboardingProgressProps) {
  const isComplete = currentStep > totalSteps;
  const progress = isComplete ? 100 : Math.round(((currentStep - 1) / totalSteps) * 100);

  return (
    <div className="w-full space-y-3">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">
            Adım {Math.min(currentStep, totalSteps)} / {totalSteps}
          </span>
          <span className="text-[11px] font-semibold text-primary">
            {isComplete ? "Tamamlandı" : `${progress}%`}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              isComplete ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step indicators - scrollable on mobile */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          const Icon = STEP_ICONS[i];
          const isCompleted = currentStep > stepNum || isComplete;
          const isCurrent = currentStep === stepNum;

          return (
            <div
              key={stepNum}
              className="flex flex-col items-center gap-1 shrink-0"
              title={STEP_LABELS[i]}
            >
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 transition-all",
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isCurrent
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                      : "border-muted-foreground/20 bg-muted text-muted-foreground/50"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="size-3" />
                ) : Icon ? (
                  <Icon className="size-3" />
                ) : (
                  <span className="text-[9px] font-bold">{stepNum}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-[8px] leading-tight text-center max-w-[40px] truncate",
                  isCompleted
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : isCurrent
                      ? "text-primary font-semibold"
                      : "text-muted-foreground/50"
                )}
              >
                {STEP_LABELS[i]?.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
