"use client";

import * as React from "react";
import { Phone, Hospital, Shield, Flame, UserPlus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { EmergencyData } from "@/lib/onboarding/types";

interface StepEmergencyProps {
  data: EmergencyData;
  onChange: (data: EmergencyData) => void;
}

export function StepEmergency({ data, onChange }: StepEmergencyProps) {
  function updateField<K extends keyof EmergencyData>(key: K, value: EmergencyData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Acil Durum</h3>
        <p className="text-xs text-muted-foreground">
          Acil durum iletişim bilgilerini girin. Bu bilgiler misafirlerin güvenliği için önemlidir.
        </p>
      </div>

      {/* Emergency contact */}
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            <Label>Acil Durum İletişim Kişisi</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ecName" className="text-[11px]">Ad Soyad</Label>
              <Input
                id="ecName"
                placeholder="İlgili kişi adı"
                value={data.emergencyContactName}
                onChange={(e) => updateField("emergencyContactName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ecPhone" className="text-[11px]">Telefon</Label>
              <Input
                id="ecPhone"
                type="tel"
                placeholder="05XX XXX XX XX"
                value={data.emergencyContactPhone}
                onChange={(e) => updateField("emergencyContactPhone", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hospital */}
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Hospital className="size-4 text-red-500" />
            <Label>En Yakın Hastane</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hospName" className="text-[11px]">Hastane Adı</Label>
              <Input
                id="hospName"
                placeholder="Hastane adı"
                value={data.nearestHospital}
                onChange={(e) => updateField("nearestHospital", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hospPhone" className="text-[11px]">Telefon</Label>
              <Input
                id="hospPhone"
                type="tel"
                placeholder="0XXX XXX XX XX"
                value={data.nearestHospitalPhone}
                onChange={(e) => updateField("nearestHospitalPhone", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Police */}
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-blue-600" />
            <Label>En Yakın Karakol</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="policeName" className="text-[11px]">Karakol Adı</Label>
              <Input
                id="policeName"
                placeholder="Karakol / Jandarma"
                value={data.nearestPolice}
                onChange={(e) => updateField("nearestPolice", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="policePhone" className="text-[11px]">Telefon</Label>
              <Input
                id="policePhone"
                type="tel"
                placeholder="0XXX XXX XX XX"
                value={data.nearestPolicePhone}
                onChange={(e) => updateField("nearestPolicePhone", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fire department & additional */}
      <div className="space-y-1.5">
        <Label htmlFor="fireDept">
          <div className="flex items-center gap-1.5">
            <Flame className="size-3.5 text-orange-500" />
            İtfaiye Numarası
          </div>
        </Label>
        <Input
          id="fireDept"
          placeholder="110"
          value={data.fireDepartment}
          onChange={(e) => updateField("fireDepartment", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="additionalContacts">
          <div className="flex items-center gap-1.5">
            <Phone className="size-3.5" />
            Ek İletişim Bilgileri
          </div>
        </Label>
        <Textarea
          id="additionalContacts"
          placeholder="örn: Veteriner, eczane, tesisatçı gibi ek numaralar..."
          className="min-h-[60px]"
          value={data.additionalContacts}
          onChange={(e) => updateField("additionalContacts", e.target.value)}
        />
      </div>
    </div>
  );
}
