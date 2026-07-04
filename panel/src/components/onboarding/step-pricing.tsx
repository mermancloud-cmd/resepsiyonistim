"use client";

import * as React from "react";
import { Banknote, CalendarDays, Plus, Trash2, TrendingUp } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { PricingData, Currency, SeasonalAdjustment } from "@/lib/onboarding/types";

interface StepPricingProps {
  data: PricingData;
  onChange: (data: PricingData) => void;
}

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: "TRY", label: "Türk Lirası", symbol: "₺" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "USD", label: "Amerikan Doları", symbol: "$" },
];

export function StepPricing({ data, onChange }: StepPricingProps) {
  function updateField<K extends keyof PricingData>(key: K, value: PricingData[K]) {
    onChange({ ...data, [key]: value });
  }

  function addSeasonalAdjustment() {
    const newAdj: SeasonalAdjustment = {
      id: crypto.randomUUID(),
      name: "",
      startDate: "06-01",
      endDate: "09-30",
      multiplier: 1.2,
    };
    updateField("seasonalAdjustments", [...data.seasonalAdjustments, newAdj]);
  }

  function updateAdjustment(id: string, field: keyof SeasonalAdjustment, value: string | number) {
    updateField(
      "seasonalAdjustments",
      data.seasonalAdjustments.map((a) =>
        a.id === id ? { ...a, [field]: value } : a
      )
    );
  }

  function removeAdjustment(id: string) {
    updateField(
      "seasonalAdjustments",
      data.seasonalAdjustments.filter((a) => a.id !== id)
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Fiyatlandırma</h3>
        <p className="text-xs text-muted-foreground">
          Para birimi, minimum konaklama süresi ve sezonluk fiyat ayarlarını belirleyin.
        </p>
      </div>

      {/* Currency selector */}
      <div className="space-y-1.5">
        <Label>Para Birimi *</Label>
        <div className="grid grid-cols-3 gap-2">
          {CURRENCIES.map((cur) => {
            const isSelected = data.currency === cur.value;
            return (
              <button
                key={cur.value}
                type="button"
                onClick={() => updateField("currency", cur.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-2.5 transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                )}
              >
                <Banknote
                  className={cn(
                    "size-5",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {cur.value}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {cur.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Minimum stay */}
      <div className="space-y-1.5">
        <Label htmlFor="minimumStayNights">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Minimum Konaklama Süresi
          </div>
        </Label>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            type="button"
            onClick={() => {
              if (data.minimumStayNights > 1)
                updateField("minimumStayNights", data.minimumStayNights - 1);
            }}
          >
            -
          </Button>
          <Input
            id="minimumStayNights"
            type="number"
            min={1}
            max={30}
            className="w-20 text-center"
            value={data.minimumStayNights}
            onChange={(e) => updateField("minimumStayNights", Math.max(1, Math.min(30, Number(e.target.value))))}
          />
          <Button
            variant="outline"
            size="icon-sm"
            type="button"
            onClick={() => {
              if (data.minimumStayNights < 30)
                updateField("minimumStayNights", data.minimumStayNights + 1);
            }}
          >
            +
          </Button>
          <span className="text-xs text-muted-foreground">gece</span>
        </div>
      </div>

      <Separator />

      {/* Seasonal adjustments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <Label>Sezonluk Fiyat Ayarları</Label>
          </div>
          {data.seasonalAdjustments.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {data.seasonalAdjustments.length} kural
            </Badge>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Belirli dönemlerde birim fiyatlarına otomatik çarpan uygulanır. Örn: Yaz sezonu +20%.
        </p>

        {data.seasonalAdjustments.map((adj) => (
          <Card key={adj.id} size="sm">
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Input
                  placeholder="Sezon adı (örn: Yaz Sezonu)"
                  value={adj.name}
                  onChange={(e) => updateAdjustment(adj.id, "name", e.target.value)}
                  className="text-sm font-medium"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive hover:text-destructive shrink-0 ml-2"
                  onClick={() => removeAdjustment(adj.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Başlangıç (AA-GG)</Label>
                  <Input
                    placeholder="06-01"
                    value={adj.startDate}
                    onChange={(e) => updateAdjustment(adj.id, "startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Bitiş (AA-GG)</Label>
                  <Input
                    placeholder="09-30"
                    value={adj.endDate}
                    onChange={(e) => updateAdjustment(adj.id, "endDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px]">Fiyat Çarpanı</Label>
                  <Badge className={cn(
                    "text-xs font-semibold px-2 py-0.5",
                    adj.multiplier > 1 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
                    adj.multiplier < 1 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
                    "bg-muted text-muted-foreground"
                  )}>
                    x{adj.multiplier.toFixed(1)}
                  </Badge>
                </div>
                <Slider
                  value={[adj.multiplier]}
                  onValueChange={(val) => {
                    const v = Array.isArray(val) ? val[0] : val;
                    updateAdjustment(adj.id, "multiplier", v);
                  }}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>x0.5 (İndirim)</span>
                  <span>x1.0 (Normal)</span>
                  <span>x2.0 (Artış)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          variant="outline"
          className="w-full border-dashed"
          size="lg"
          onClick={addSeasonalAdjustment}
        >
          <Plus className="size-4" />
          Sezon Kuralı Ekle
        </Button>
      </div>
    </div>
  );
}
