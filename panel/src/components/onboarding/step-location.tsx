"use client";

import * as React from "react";
import { MapPin, Car, Navigation, Info } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import type { LocationData } from "@/lib/onboarding/types";

interface StepLocationProps {
  data: LocationData;
  onChange: (data: LocationData) => void;
}

export function StepLocation({ data, onChange }: StepLocationProps) {
  const [latStr, setLatStr] = React.useState(data.latitude?.toString() ?? "");
  const [lngStr, setLngStr] = React.useState(data.longitude?.toString() ?? "");

  function updateField<K extends keyof LocationData>(key: K, value: LocationData[K]) {
    onChange({ ...data, [key]: value });
  }

  function handleLatChange(val: string) {
    setLatStr(val);
    const num = parseFloat(val);
    updateField("latitude", isNaN(num) ? null : num);
  }

  function handleLngChange(val: string) {
    setLngStr(val);
    const num = parseFloat(val);
    updateField("longitude", isNaN(num) ? null : num);
  }

  function handleUseGeolocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLatStr(lat.toFixed(6));
          setLngStr(lng.toFixed(6));
          onChange({ ...data, latitude: lat, longitude: lng });
        },
        () => {
          // silently fail — user can type manually
        }
      );
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Konum ve Ulaşım</h3>
        <p className="text-xs text-muted-foreground">
          İşletmenizin konumunu ve misafirlerin ulaşım bilgilerini girin.
        </p>
      </div>

      {/* Coordinates */}
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <Label>Koordinatlar</Label>
            </div>
            <button
              type="button"
              onClick={handleUseGeolocation}
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
            >
              <Navigation className="size-3" />
              Konumumu Kullan
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="latitude" className="text-[11px]">Enlem</Label>
              <Input
                id="latitude"
                placeholder="41.0082"
                value={latStr}
                onChange={(e) => handleLatChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="longitude" className="text-[11px]">Boylam</Label>
              <Input
                id="longitude"
                placeholder="28.9784"
                value={lngStr}
                onChange={(e) => handleLngChange(e.target.value)}
              />
            </div>
          </div>

          {/* Map placeholder */}
          <div className="flex h-32 items-center justify-center rounded-lg bg-muted border border-dashed border-border">
            <div className="text-center text-muted-foreground">
              <MapPin className="size-6 mx-auto mb-1 opacity-50" />
              <p className="text-[11px]">Harita önizleme</p>
              <p className="text-[10px] opacity-70">Koordinat girildiğinde gösterilir</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directions */}
      <div className="space-y-1.5">
        <Label htmlFor="directions">
          <div className="flex items-center gap-1.5">
            <Navigation className="size-3.5" />
            Yol Tarifi
          </div>
        </Label>
        <Textarea
          id="directions"
          placeholder="örn: Ana yoldan sağa dönün, 2 km sonra tabelaları takip edin..."
          className="min-h-[80px]"
          value={data.directions}
          onChange={(e) => updateField("directions", e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          Misafirlere rezervasyon sonrası gönderilir.
        </p>
      </div>

      {/* Parking */}
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="size-4 text-primary" />
              <Label>Otopark Mevcut</Label>
            </div>
            <Switch
              checked={data.parkingAvailable}
              onCheckedChange={(checked) =>
                updateField("parkingAvailable", checked as boolean)
              }
            />
          </div>

          {data.parkingAvailable && (
            <div className="space-y-1.5">
              <Label htmlFor="parkingInfo" className="text-[11px]">Otopark Detayları</Label>
              <Input
                id="parkingInfo"
                placeholder="örn: Ücretsiz açık otopark, 5 araçlık"
                value={data.parkingInfo}
                onChange={(e) => updateField("parkingInfo", e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground">
        <Info className="size-3.5 shrink-0 mt-0.5" />
        <p>Koordinatları Google Haritalar&apos;dan kopyalayabilirsiniz. Haritaya tıklayarak da konum seçebilirsiniz.</p>
      </div>
    </div>
  );
}
