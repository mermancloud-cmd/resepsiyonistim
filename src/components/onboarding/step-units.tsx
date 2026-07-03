"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  Users,
  Home,
  ChevronDown,
  ChevronUp,
  TurkishLira,
  Hash,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { UnitData } from "@/lib/onboarding/types";

interface StepUnitsProps {
  data: UnitData[];
  onChange: (data: UnitData[]) => void;
}

function createEmptyUnit(): UnitData {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    capacity: 2,
    count: 1,
    basePrice: 0,
    weekendPrice: 0,
    amenities: [],
  };
}

export function StepUnits({ data, onChange }: StepUnitsProps) {
  const [expandedUnit, setExpandedUnit] = React.useState<string | null>(
    data[0]?.id ?? null
  );

  function updateUnit(unitId: string, field: keyof UnitData, value: unknown) {
    const updated = data.map((u) =>
      u.id === unitId ? { ...u, [field]: value } : u
    );
    onChange(updated);
  }

  function addUnit() {
    const newUnit = createEmptyUnit();
    onChange([...data, newUnit]);
    setExpandedUnit(newUnit.id);
  }

  function removeUnit(unitId: string) {
    if (data.length <= 1) return;
    const filtered = data.filter((u) => u.id !== unitId);
    onChange(filtered);
    if (expandedUnit === unitId) {
      setExpandedUnit(filtered[0]?.id ?? null);
    }
  }

  function incrementCapacity(unitId: string) {
    const unit = data.find((u) => u.id === unitId);
    if (unit && unit.capacity < 20) {
      updateUnit(unitId, "capacity", unit.capacity + 1);
    }
  }

  function decrementCapacity(unitId: string) {
    const unit = data.find((u) => u.id === unitId);
    if (unit && unit.capacity > 1) {
      updateUnit(unitId, "capacity", unit.capacity - 1);
    }
  }

  function incrementCount(unitId: string) {
    const unit = data.find((u) => u.id === unitId);
    if (unit && unit.count < 50) {
      updateUnit(unitId, "count", unit.count + 1);
    }
  }

  function decrementCount(unitId: string) {
    const unit = data.find((u) => u.id === unitId);
    if (unit && unit.count > 1) {
      updateUnit(unitId, "count", unit.count - 1);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Birim Tipleri</h3>
        <p className="text-xs text-muted-foreground">
          İşletmenize ait konaklama birimlerini tanımlayın. Her tip için ad, kapasite ve adet bilgilerini girin.
        </p>
      </div>

      <div className="space-y-3">
        {data.map((unit, index) => {
          const isExpanded = expandedUnit === unit.id;
          const hasName = unit.name.trim().length > 0;

          return (
            <Card
              key={unit.id}
              size="sm"
              className={cn(
                "transition-all",
                isExpanded && "ring-1 ring-primary/30"
              )}
            >
              {/* Collapsible header */}
              <button
                type="button"
                onClick={() =>
                  setExpandedUnit(isExpanded ? null : unit.id)
                }
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      hasName ? "bg-primary/10" : "bg-muted"
                    )}
                  >
                    <Home
                      className={cn(
                        "size-4",
                        hasName
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {hasName ? unit.name : `Birim ${index + 1}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {unit.capacity} kişi · {unit.count} adet · {unit.basePrice > 0 ? `₺${unit.basePrice.toLocaleString("tr-TR")}` : "Fiyat girilmedi"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {data.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUnit(unit.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <>
                  <Separator />
                  <CardContent className="space-y-4 pt-0">
                    {/* Unit name */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`unit-name-${unit.id}`}>
                        Birim Adı *
                      </Label>
                      <Input
                        id={`unit-name-${unit.id}`}
                        placeholder="örn: Deluxe Oda A1"
                        value={unit.name}
                        onChange={(e) =>
                          updateUnit(unit.id, "name", e.target.value)
                        }
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`unit-desc-${unit.id}`}>
                        Açıklama
                      </Label>
                      <Input
                        id={`unit-desc-${unit.id}`}
                        placeholder="Kısa bir açıklama..."
                        value={unit.description}
                        onChange={(e) =>
                          updateUnit(unit.id, "description", e.target.value)
                        }
                      />
                    </div>

                    {/* Capacity & Count */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>
                          <div className="flex items-center gap-1">
                            <Users className="size-3" />
                            Kapasite (Kişi)
                          </div>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => decrementCapacity(unit.id)}
                            disabled={unit.capacity <= 1}
                          >
                            -
                          </Button>
                          <div className="flex items-center justify-center rounded-lg border border-input px-3 py-1.5 min-w-[50px]">
                            <span className="text-sm font-medium">{unit.capacity}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => incrementCapacity(unit.id)}
                            disabled={unit.capacity >= 20}
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>
                          <div className="flex items-center gap-1">
                            <Hash className="size-3" />
                            Adet
                          </div>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => decrementCount(unit.id)}
                            disabled={unit.count <= 1}
                          >
                            -
                          </Button>
                          <div className="flex items-center justify-center rounded-lg border border-input px-3 py-1.5 min-w-[50px]">
                            <span className="text-sm font-medium">{unit.count}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => incrementCount(unit.id)}
                            disabled={unit.count >= 50}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Pricing per unit type */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`unit-base-${unit.id}`}>
                          <div className="flex items-center gap-1">
                            <TurkishLira className="size-3" />
                            Gece Ücreti
                          </div>
                        </Label>
                        <Input
                          id={`unit-base-${unit.id}`}
                          type="number"
                          min={0}
                          placeholder="0"
                          value={unit.basePrice || ""}
                          onChange={(e) =>
                            updateUnit(
                              unit.id,
                              "basePrice",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`unit-weekend-${unit.id}`}>
                          <div className="flex items-center gap-1">
                            <TurkishLira className="size-3" />
                            Hafta Sonu
                          </div>
                        </Label>
                        <Input
                          id={`unit-weekend-${unit.id}`}
                          type="number"
                          min={0}
                          placeholder="0"
                          value={unit.weekendPrice || ""}
                          onChange={(e) =>
                            updateUnit(
                              unit.id,
                              "weekendPrice",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add unit button */}
      <Button
        variant="outline"
        className="w-full border-dashed"
        size="lg"
        onClick={addUnit}
      >
        <Plus className="size-4" />
        Yeni Birim Tipi Ekle
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">
        {data.length} birim tipi · Toplam {data.reduce((sum, u) => sum + u.count, 0)} adet birim
      </p>
    </div>
  );
}
