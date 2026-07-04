"use client";

import * as React from "react";
import { Clock, Dog, Cigarette, Moon, BookOpen } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RulesData } from "@/lib/onboarding/types";

interface StepRulesProps {
  data: RulesData;
  onChange: (data: RulesData) => void;
}

const PET_POLICIES = [
  { value: "allowed" as const, label: "Serbest", desc: "Evcil hayvan kabul edilir" },
  { value: "on_request" as const, label: "Talep Üzerine", desc: "Ön onay gerekli" },
  { value: "not_allowed" as const, label: "Kabul Edilmez", desc: "Evcil hayvan yasak" },
];

const SMOKING_POLICIES = [
  { value: "allowed" as const, label: "Serbest", desc: "Her alanda serbest" },
  { value: "outdoor_only" as const, label: "Sadece Dışarıda", desc: "İç mekan yasak" },
  { value: "not_allowed" as const, label: "Yasak", desc: "Tüm alanlarda yasak" },
];

const TIME_OPTIONS = [
  "06:00","07:00","08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00",
  "20:00","21:00","22:00","23:00","00:00",
];

export function StepRules({ data, onChange }: StepRulesProps) {
  function updateField<K extends keyof RulesData>(key: K, value: RulesData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Kurallar</h3>
        <p className="text-xs text-muted-foreground">
          İşletmenizin temel kurallarını belirleyin. Misafirler rezervasyon öncesinde bu kuralları görür.
        </p>
      </div>

      {/* Check-in / Check-out */}
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <Label>Giriş / Çıkış Saatleri</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="checkIn" className="text-[11px]">Giriş Saati</Label>
              <select
                id="checkIn"
                value={data.checkInTime}
                onChange={(e) => updateField("checkInTime", e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkOut" className="text-[11px]">Çıkış Saati</Label>
              <select
                id="checkOut"
                value={data.checkOutTime}
                onChange={(e) => updateField("checkOutTime", e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pet Policy */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Dog className="size-4 text-primary" />
          <Label>Evcil Hayvan Politikası</Label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PET_POLICIES.map((policy) => {
            const isSelected = data.petPolicy === policy.value;
            return (
              <button
                key={policy.value}
                type="button"
                onClick={() => updateField("petPolicy", policy.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 transition-all text-center",                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {policy.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {policy.desc}
                </span>
              </button>
            );
          })}
        </div>
        {data.petPolicy === "on_request" && (
          <Input
            placeholder="Detay belirtin (örn: sadece küçük ırk)"
            value={data.petDetails}
            onChange={(e) => updateField("petDetails", e.target.value)}
          />
        )}
      </div>

      {/* Smoking Policy */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Cigarette className="size-4 text-primary" />
          <Label>Sigara Politikası</Label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SMOKING_POLICIES.map((policy) => {
            const isSelected = data.smokingPolicy === policy.value;
            return (
              <button
                key={policy.value}
                type="button"
                onClick={() => updateField("smokingPolicy", policy.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 transition-all text-center",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {policy.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {policy.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quiet Hours */}
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Moon className="size-4 text-primary" />
            <Label>Sessizlik Saatleri</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Başlangıç</Label>
              <select
                value={data.quietHoursStart}
                onChange={(e) => updateField("quietHoursStart", e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Bitiş</Label>
              <select
                value={data.quietHoursEnd}
                onChange={(e) => updateField("quietHoursEnd", e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Rules */}
      <div className="space-y-1.5">
        <Label htmlFor="additionalRules">
          <div className="flex items-center gap-1.5">
            <BookOpen className="size-3.5" />
            Ek Kurallar
          </div>
        </Label>
        <Textarea
          id="additionalRules"
          placeholder="örn: Açık alanda ateş yakmak yasaktır. Havlu ve çarşaflar sağlanır..."
          className="min-h-[80px]"
          value={data.additionalRules}
          onChange={(e) => updateField("additionalRules", e.target.value)}
        />
      </div>
    </div>
  );
}
