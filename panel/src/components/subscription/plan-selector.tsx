"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPlanPrice, SUBSCRIPTION_PLANS } from "@/lib/subscription/plans";
import { Check, Star, Zap } from "lucide-react";
import type { SubscriptionPlanId } from "@/lib/iyzico/types";

interface PlanSelectorProps {
  selectedPlan: SubscriptionPlanId | null;
  onSelect: (planId: SubscriptionPlanId) => void;
  disabled?: boolean;
}

export function PlanSelector({ selectedPlan, onSelect, disabled }: PlanSelectorProps) {
  return (
    <div className="grid gap-3">
      {SUBSCRIPTION_PLANS.map((plan) => {
        const isSelected = selectedPlan === plan.id;
        return (
          <Card
            key={plan.id}
            size="sm"
            className={cn(
              "cursor-pointer transition-all ring-offset-2",
              isSelected
                ? "ring-2 ring-primary shadow-md"
                : "hover:ring-1 hover:ring-primary/30",
              plan.recommended && !isSelected && "border-amber-200 dark:border-amber-800",
              disabled && "opacity-50 pointer-events-none"
            )}
            onClick={() => onSelect(plan.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {plan.recommended && (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 text-[10px]"
                    >
                      <Star className="size-3 mr-1" />
                      Önerilen
                    </Badge>
                  )}
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">
                    {formatPlanPrice(plan.price)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">/ay</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">
                {plan.description}
              </p>

              {/* Key limits */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge variant="secondary" className="text-[10px]">
                  <Zap className="size-2.5 mr-1" />
                  {plan.limits.aiMessagesPerMonth === -1
                    ? "Sınırsız"
                    : plan.limits.aiMessagesPerMonth.toLocaleString("tr-TR")}{" "}
                  AI mesajı
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {plan.limits.properties === -1
                    ? "Sınırsız"
                    : plan.limits.properties}{" "}
                  tesis
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {plan.limits.whatsappInstances} WhatsApp
                </Badge>
              </div>

              {/* Features */}
              <ul className="space-y-1.5">
                {plan.features.slice(0, isSelected ? undefined : 4).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <Check className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
                {!isSelected && plan.features.length > 4 && (
                  <li className="text-[10px] text-muted-foreground pl-5.5">
                    +{plan.features.length - 4} özellik daha…
                  </li>
                )}
              </ul>

              {/* Trial badge */}
              <div className="mt-3 pt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground">
                  ✨ {plan.trialDays} gün ücretsiz deneme (davet kodu ile)
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
