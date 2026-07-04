"use client";

import * as React from "react";
import { Building, CreditCard, Percent, Landmark, Info } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { DepositPaymentData } from "@/lib/onboarding/types";

interface StepDepositPaymentProps {
  data: DepositPaymentData;
  onChange: (data: DepositPaymentData) => void;
}

const PAYMENT_METHODS = [
  { id: "havale", label: "Havale / EFT", desc: "Banka transferi" },
  { id: "nakit", label: "Nakit", desc: "Kapıda nakit ödeme" },
  { id: "kapida_kart", label: "Kapıda Kart", desc: "POS cihazı ile ödeme" },
];

export function StepDepositPayment({ data, onChange }: StepDepositPaymentProps) {
  function updateField<K extends keyof DepositPaymentData>(key: K, value: DepositPaymentData[K]) {
    onChange({ ...data, [key]: value });
  }

  function togglePaymentMethod(id: string) {
    const has = data.paymentMethods.includes(id);
    updateField(
      "paymentMethods",
      has
        ? data.paymentMethods.filter((m) => m !== id)
        : [...data.paymentMethods, id]
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Depozito ve Ödeme</h3>
        <p className="text-xs text-muted-foreground">
          Ön ödeme oranı ve ödeme yöntemlerini belirleyin. IBAN bilgilerinizi girin.
        </p>
      </div>

      {/* Deposit type */}
      <div className="space-y-2">
        <Label>Ön Ödeme Türü</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateField("depositType", "percentage")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all text-center",
              data.depositType === "percentage"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-primary/40"
            )}
          >
            <Percent className={cn("size-5", data.depositType === "percentage" ? "text-primary" : "text-muted-foreground")} />
            <span className="text-xs font-medium">Yüzde</span>
            <span className="text-[10px] text-muted-foreground">Toplam tutarın %&apos;i</span>
          </button>
          <button
            type="button"
            onClick={() => updateField("depositType", "fixed")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all text-center",
              data.depositType === "fixed"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-primary/40"
            )}
          >
            <CreditCard className={cn("size-5", data.depositType === "fixed" ? "text-primary" : "text-muted-foreground")} />
            <span className="text-xs font-medium">Sabit Tutar</span>
            <span className="text-[10px] text-muted-foreground">Belirli bir tutar</span>
          </button>
        </div>
      </div>

      {/* Deposit amount/percentage */}
      {data.depositType === "percentage" ? (
        <Card size="sm">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Ön Ödeme Oranı</Label>
              <Badge className="bg-primary/10 text-primary font-semibold text-sm px-2.5 py-0.5">
                %{data.depositPercentage}
              </Badge>
            </div>
            <Slider
              value={[data.depositPercentage]}
              onValueChange={(val) => {
                const v = Array.isArray(val) ? val[0] : val;
                updateField("depositPercentage", v);
              }}
              min={0}
              max={100}
              step={5}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>%0</span>
              <span>%50</span>
              <span>%100</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="fixedAmount">Sabit Ön Ödeme Tutarı (₺)</Label>
          <Input
            id="fixedAmount"
            type="number"
            min={0}
            placeholder="0"
            value={data.depositFixedAmount || ""}
            onChange={(e) => updateField("depositFixedAmount", Number(e.target.value))}
          />
        </div>
      )}

      {/* IBAN & Bank Details */}
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Landmark className="size-4 text-primary" />
            <Label>Banka Bilgileri</Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="iban" className="text-[11px]">IBAN</Label>
            <Input
              id="iban"
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              value={data.iban}
              onChange={(e) => updateField("iban", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bankName" className="text-[11px]">Banka Adı</Label>
              <Input
                id="bankName"
                placeholder="örn: Ziraat Bankası"
                value={data.bankName}
                onChange={(e) => updateField("bankName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountHolder" className="text-[11px]">Hesap Sahibi</Label>
              <Input
                id="accountHolder"
                placeholder="Ad Soyad / Şirket"
                value={data.accountHolder}
                onChange={(e) => updateField("accountHolder", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment methods */}
      <div className="space-y-2">
        <Label>Ödeme Yöntemleri</Label>
        <div className="space-y-2">
          {PAYMENT_METHODS.map((method) => {
            const isChecked = data.paymentMethods.includes(method.id);
            return (
              <Card
                key={method.id}
                size="sm"
                className={cn(
                  "cursor-pointer transition-all",
                  isChecked ? "ring-1 ring-primary/30 bg-primary/5" : "hover:ring-primary/20"
                )}
                onClick={() => togglePaymentMethod(method.id)}
              >
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => togglePaymentMethod(method.id)}
                    />
                    <Building className={cn("size-4", isChecked ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <p className="text-sm font-medium">{method.label}</p>
                      <p className="text-[11px] text-muted-foreground">{method.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground">
        <Info className="size-3.5 shrink-0 mt-0.5" />
        <p>IBAN bilgileriniz rezervasyon onayında misafire gönderilir. Havale/EFT ile ön ödeme alınır.</p>
      </div>
    </div>
  );
}
