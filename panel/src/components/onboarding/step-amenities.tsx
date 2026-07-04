"use client";

import * as React from "react";
import {
  Waves,
  Flame,
  UtensilsCrossed,
  Wifi,
  Wind,
  Car,
  Trees,
  Tv,
  WashingMachine,
  Dog,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AmenitiesData } from "@/lib/onboarding/types";

interface StepAmenitiesProps {
  data: AmenitiesData;
  onChange: (data: AmenitiesData) => void;
}

interface AmenityItem {
  key: keyof AmenitiesData;
  label: string;
  description: string;
  icon: LucideIcon;
}

const AMENITY_ITEMS: AmenityItem[] = [
  { key: "jacuzzi", label: "Jakuzi", description: "Özel jakuzi / sıcak küvet", icon: Waves },
  { key: "pool", label: "Havuz", description: "Açık / kapalı yüzme havuzu", icon: Waves },
  { key: "bbq", label: "Barbekü", description: "Mangal / barbekü alanı", icon: Flame },
  { key: "kitchen", label: "Mutfak", description: "Tam donanımlı mutfak", icon: UtensilsCrossed },
  { key: "wifi", label: "WiFi", description: "Ücretsiz kablosuz internet", icon: Wifi },
  { key: "ac", label: "Klima", description: "Soğutma / ısıtma", icon: Wind },
  { key: "parking", label: "Otopark", description: "Ücretsiz araç park alanı", icon: Car },
  { key: "garden", label: "Bahçe", description: "Özel / ortak bahçe", icon: Trees },
  { key: "tv", label: "TV", description: "Uydu / smart TV", icon: Tv },
  { key: "fireplace", label: "Şömine", description: "İç mekan şöminesi", icon: Flame },
  { key: "washingMachine", label: "Çamaşır Makinesi", description: "Çamaşır yıkama imkanı", icon: WashingMachine },
  { key: "petFriendly", label: "Evcil Hayvan", description: "Evcil hayvan kabul edilir", icon: Dog },
];

export function StepAmenities({ data, onChange }: StepAmenitiesProps) {
  const selectedCount = AMENITY_ITEMS.filter((item) => data[item.key]).length;

  function toggle(key: keyof AmenitiesData) {
    onChange({ ...data, [key]: !data[key] });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Özel Özellikler</h3>
          <Badge variant="outline" className="text-[10px]">
            {selectedCount} seçili
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          İşletmenizde sunulan genel özellikleri işaretleyin. Bu bilgiler misafirlere gösterilir.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {AMENITY_ITEMS.map((item) => {
          const Icon = item.icon;
          const isChecked = data[item.key];
          return (
            <Card
              key={item.key}
              size="sm"
              className={cn(
                "cursor-pointer transition-all hover:ring-1",
                isChecked
                  ? "ring-1 ring-primary/30 bg-primary/5"
                  : "hover:ring-primary/20"
              )}
              onClick={() => toggle(item.key)}
            >
              <CardContent>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggle(item.key)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg shrink-0",
                      isChecked
                        ? "bg-primary/10"
                        : "bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4",
                        isChecked ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      isChecked ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {item.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Daha sonra Ayarlar sayfasından güncelleyebilirsiniz.
      </p>
    </div>
  );
}
