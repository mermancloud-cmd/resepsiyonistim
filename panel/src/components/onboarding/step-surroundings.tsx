"use client";

import * as React from "react";
import { ShoppingBag, UtensilsCrossed, MapPin, Bus, Waves, Plane, Building2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { SurroundingsData } from "@/lib/onboarding/types";

interface StepSurroundingsProps {
  data: SurroundingsData;
  onChange: (data: SurroundingsData) => void;
}

export function StepSurroundings({ data, onChange }: StepSurroundingsProps) {
  function updateField<K extends keyof SurroundingsData>(key: K, value: SurroundingsData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Çevre Bilgileri</h3>
        <p className="text-xs text-muted-foreground">
          Yakın çevredeki önemli mekanlar ve mesafeleri girin. Bu bilgiler misafirlere yardımcı olur.
        </p>
      </div>

      {/* Markets & Restaurants */}
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="markets">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="size-3.5" />
                Yakın Marketler
              </div>
            </Label>
            <Textarea
              id="markets"
              placeholder="örn: BİM 500m, Şok Market 1km, Migros 3km"
              className="min-h-[60px]"
              value={data.nearbyMarkets}
              onChange={(e) => updateField("nearbyMarkets", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="restaurants">
              <div className="flex items-center gap-1.5">
                <UtensilsCrossed className="size-3.5" />
                Yakın Restoranlar
              </div>
            </Label>
            <Textarea
              id="restaurants"
              placeholder="örn: Köy Kahvaltısı 200m, Deniz Restoran 2km"
              className="min-h-[60px]"
              value={data.nearbyRestaurants}
              onChange={(e) => updateField("nearbyRestaurants", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Attractions */}
      <div className="space-y-1.5">
        <Label htmlFor="attractions">
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            Gezilecek Yerler
          </div>
        </Label>
        <Textarea
          id="attractions"
          placeholder="örn: Saklıkent Kanyonu 15km, Kelebekler Vadisi 20km, Ölüdeniz 25km"
          className="min-h-[60px]"
          value={data.nearbyAttractions}
          onChange={(e) => updateField("nearbyAttractions", e.target.value)}
        />
      </div>

      {/* Transport */}
      <div className="space-y-1.5">
        <Label htmlFor="transport">
          <div className="flex items-center gap-1.5">
            <Bus className="size-3.5" />
            Ulaşım Seçenekleri
          </div>
        </Label>
        <Textarea
          id="transport"
          placeholder="örn: Otobüs durağı 500m, Taksi durağı 1km"
          className="min-h-[60px]"
          value={data.nearbyTransport}
          onChange={(e) => updateField("nearbyTransport", e.target.value)}
        />
      </div>

      {/* Distances */}
      <Card size="sm">
        <CardContent className="space-y-3">
          <Label className="text-xs font-semibold">Önemli Mesafeler</Label>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Waves className="size-3.5 text-blue-500 shrink-0" />
              <Input
                placeholder="Denize uzaklık (örn: 5 km)"
                value={data.distanceToBeach}
                onChange={(e) => updateField("distanceToBeach", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Plane className="size-3.5 text-sky-500 shrink-0" />
              <Input
                placeholder="Havalimanına uzaklık (örn: 45 km)"
                value={data.distanceToAirport}
                onChange={(e) => updateField("distanceToAirport", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="size-3.5 text-gray-500 shrink-0" />
              <Input
                placeholder="Şehir merkezine uzaklık (örn: 10 km)"
                value={data.distanceToCenter}
                onChange={(e) => updateField("distanceToCenter", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
