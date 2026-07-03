"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Home, Castle, Building, TreePine, House } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BusinessInfoData, BusinessType } from "@/lib/onboarding/types";

const businessInfoSchema = z.object({
  businessName: z.string().min(2, "İşletme adı en az 2 karakter olmalıdır"),
  businessType: z.enum(["bungalow", "tiny_house", "villa", "hotel", "pension", "apartment"], {
    error: "İşletme türü seçiniz",
  }),
  address: z.string().min(5, "Adres en az 5 karakter olmalıdır"),
  city: z.string().min(2, "Şehir adı en az 2 karakter olmalıdır"),
  phone: z
    .string()
    .min(10, "Geçerli bir telefon numarası giriniz"),
  whatsappNumber: z
    .string()
    .min(10, "Geçerli bir WhatsApp numarası giriniz"),
  email: z.email("Geçerli bir e-posta adresi giriniz"),
});

type BusinessInfoForm = z.infer<typeof businessInfoSchema>;

const BUSINESS_TYPES: {
  value: BusinessType;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    value: "bungalow",
    label: "Bungalov",
    icon: Home,
    description: "Müstakil ahşap evler",
  },
  {
    value: "tiny_house",
    label: "Tiny House",
    icon: TreePine,
    description: "Mini ev / Tiny house",
  },
  {
    value: "villa",
    label: "Villa",
    icon: House,
    description: "Müstakil villa",
  },
  {
    value: "hotel",
    label: "Otel",
    icon: Building2,
    description: "Otel / Butik otel",
  },
  {
    value: "pension",
    label: "Pansiyon",
    icon: Castle,
    description: "Pansiyon / Hostel",
  },
  {
    value: "apartment",
    label: "Apart",
    icon: Building,
    description: "Apart daire / Suit",
  },
];

interface StepBusinessInfoProps {
  data: BusinessInfoData;
  onChange: (data: BusinessInfoData) => void;
}

export function StepBusinessInfo({ data, onChange }: StepBusinessInfoProps) {
  const form = useForm<BusinessInfoForm>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: data,
    mode: "onBlur",
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const selectedType = watch("businessType");

  // Sync parent on any valid change
  React.useEffect(() => {
    const subscription = watch((values) => {
      onChange(values as BusinessInfoData);
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);


  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">İşletme Bilgileri</h3>
        <p className="text-xs text-muted-foreground">
          İşletmenizin temel bilgilerini girin. Bu bilgiler profil sayfanızda görüntülenecektir.
        </p>
      </div>

      {/* Business Name */}
      <div className="space-y-1.5">
        <Label htmlFor="businessName">İşletme Adı *</Label>
        <Input
          id="businessName"
          placeholder="örn: Yeşil Vadi İşletmesi"
          {...register("businessName")}
          aria-invalid={!!errors.businessName}
        />
        {errors.businessName && (
          <p className="text-xs text-destructive">{errors.businessName.message}</p>
        )}
      </div>

      {/* Business Type Selector */}
      <div className="space-y-1.5">
        <Label>İşletme Türü *</Label>
        <div className="grid grid-cols-3 gap-2">
          {BUSINESS_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setValue("businessType", type.value, { shouldValidate: true })}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all text-center",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg",
                    isSelected ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {type.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {type.description}
                </span>
              </button>
            );
          })}
        </div>
        {errors.businessType && (
          <p className="text-xs text-destructive">{errors.businessType.message}</p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Adres *</Label>
        <Input
          id="address"
          placeholder="Mahalle, sokak, no..."
          {...register("address")}
          aria-invalid={!!errors.address}
        />
        {errors.address && (
          <p className="text-xs text-destructive">{errors.address.message}</p>
        )}
      </div>

      {/* City */}
      <div className="space-y-1.5">
        <Label htmlFor="city">Şehir *</Label>
        <Input
          id="city"
          placeholder="örn: Antalya"
          {...register("city")}
          aria-invalid={!!errors.city}
        />
        {errors.city && (
          <p className="text-xs text-destructive">{errors.city.message}</p>
        )}
      </div>

      {/* Phone & Email in a card */}
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="05XX XXX XX XX"
              {...register("phone")}
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsappNumber">WhatsApp Numarası *</Label>
            <Input
              id="whatsappNumber"
              type="tel"
              placeholder="05XX XXX XX XX (WhatsApp)"
              {...register("whatsappNumber")}
              aria-invalid={!!errors.whatsappNumber}
            />
            {errors.whatsappNumber && (
              <p className="text-xs text-destructive">{errors.whatsappNumber.message}</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Misafirlerle WhatsApp üzerinden iletişim kurmak için kullanılacak numara.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta *</Label>
            <Input
              id="email"
              type="email"
              placeholder="info@isletme.com"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
