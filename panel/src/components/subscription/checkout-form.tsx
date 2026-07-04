"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CreditCard, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

interface CheckoutFormProps {
  planName: string;
  planPrice: number;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  isLoading: boolean;
  error?: string | null;
  onInitialize: (buyer: BuyerInfo) => void;
}

export interface BuyerInfo {
  name: string;
  surname: string;
  email: string;
  phone: string;
  identityNumber: string;
  address: string;
  city: string;
  zipCode: string;
}

export function CheckoutForm({
  planName,
  planPrice,
  checkoutFormContent,
  paymentPageUrl,
  isLoading,
  error,
  onInitialize,
}: CheckoutFormProps) {
  const [buyer, setBuyer] = React.useState<BuyerInfo>({
    name: "",
    surname: "",
    email: "",
    phone: "",
    identityNumber: "",
    address: "",
    city: "",
    zipCode: "",
  });

  const [step, setStep] = React.useState<"form" | "payment">("form");

  const handleChange = (field: keyof BuyerInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setBuyer((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("payment");
    onInitialize(buyer);
  };

  const isValid =
    buyer.name.trim() !== "" &&
    buyer.surname.trim() !== "" &&
    buyer.email.trim() !== "" &&
    buyer.phone.trim() !== "" &&
    buyer.address.trim() !== "";

  // If we have checkout form content, render it
  if (step === "payment" && checkoutFormContent) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-5 text-primary" />
            Ödeme Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 rounded-lg bg-muted/50 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{planName}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Tutar</span>
              <span className="font-bold text-primary">
                ₺{planPrice.toLocaleString("tr-TR")}
                <span className="text-xs font-normal text-muted-foreground">/ay</span>
              </span>
            </div>
          </div>

          {/* IYZICO checkout form renders here */}
          <div
            id="iyzico-checkout-form"
            dangerouslySetInnerHTML={{ __html: checkoutFormContent }}
            className="iyzico-checkout-container"
          />
        </CardContent>
      </Card>
    );
  }

  // If we have a payment page URL, redirect there
  if (step === "payment" && paymentPageUrl && !isLoading) {
    React.useEffect(() => {
      window.location.href = paymentPageUrl;
    }, [paymentPageUrl]);
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="size-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm text-muted-foreground">
            Ödeme sayfasına yönlendiriliyorsunuz…
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="size-5 text-primary" />
          Fatura Bilgileri
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          İYZİCO güvenli ödeme için fatura bilgilerinizi girin.
        </p>
      </CardHeader>
      <CardContent>
        {/* Order summary */}
        <div className="mb-4 rounded-lg bg-muted/50 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium">{planName}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-muted-foreground">Tutar</span>
            <span className="font-bold text-primary">
              ₺{planPrice.toLocaleString("tr-TR")}
              <span className="text-xs font-normal text-muted-foreground">/ay</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Ad</Label>
              <Input
                id="name"
                value={buyer.name}
                onChange={handleChange("name")}
                placeholder="Adınız"
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="surname" className="text-xs">Soyad</Label>
              <Input
                id="surname"
                value={buyer.surname}
                onChange={handleChange("surname")}
                placeholder="Soyadınız"
                className="h-9 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">E-posta</Label>
            <Input
              id="email"
              type="email"
              value={buyer.email}
              onChange={handleChange("email")}
              placeholder="ornek@email.com"
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={buyer.phone}
                onChange={handleChange("phone")}
                placeholder="+90 5XX XXX XX XX"
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tc" className="text-xs">TC Kimlik No</Label>
              <Input
                id="tc"
                value={buyer.identityNumber}
                onChange={handleChange("identityNumber")}
                placeholder="11111111111"
                maxLength={11}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="address" className="text-xs">Adres</Label>
            <Input
              id="address"
              value={buyer.address}
              onChange={handleChange("address")}
              placeholder="Açık adres"
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs">İl</Label>
              <Input
                id="city"
                value={buyer.city}
                onChange={handleChange("city")}
                placeholder="Antalya"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="zip" className="text-xs">Posta Kodu</Label>
              <Input
                id="zip"
                value={buyer.zipCode}
                onChange={handleChange("zipCode")}
                placeholder="07000"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-4"
            size="lg"
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Ödeme hazırlanıyor…
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" />
                İYZİCO ile Güvenli Ödeme
              </>
            )}
          </Button>
        </form>

        {/* Security badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <ShieldCheck className="size-3" />
          <span>256-bit SSL ile korunur · İYZİCO güvencesiyle</span>
        </div>
      </CardContent>
    </Card>
  );
}
