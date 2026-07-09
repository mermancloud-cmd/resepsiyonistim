"use client";

import { useState, useRef, useEffect } from "react";
import { useFacilities } from "@/hooks/use-facilities";
import { Building2, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function FacilitySwitcher() {
  const {
    facilities,
    selectedFacilityId,
    setSelectedFacilityId,
    selectedFacility,
    count,
  } = useFacilities();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (count <= 1 && facilities.length <= 1) {
    // Single facility — show name but no dropdown
    if (facilities.length === 1) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="size-3.5 shrink-0" />
          <span className="truncate max-w-[120px]">
            {facilities[0].name}
          </span>
        </div>
      );
    }
    return null; // No facilities yet
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg border border-border/50 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors touch-target"
        aria-label="Tesis seçici"
        aria-expanded={isOpen}
      >
        <Building2 className="size-3.5 shrink-0 text-primary" />
        <span className="truncate max-w-[100px]">
          {selectedFacility?.name ?? "Tüm Tesisler"}
        </span>
        <ChevronDown
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] rounded-xl border border-border bg-card shadow-xl animate-in fade-in slide-in-from-top-1">
          <div className="p-1">
            {/* "All facilities" option */}
            <button
              type="button"
              onClick={() => {
                setSelectedFacilityId(null);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                !selectedFacilityId
                  ? "bg-primary/5 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Building2 className="size-4 shrink-0" />
              <span className="flex-1">Tüm Tesisler</span>
              {!selectedFacilityId && (
                <Check className="size-3.5 shrink-0" />
              )}
            </button>

            {/* Divider */}
            {count > 1 && (
              <div className="my-1 border-t border-border/50" />
            )}

            {/* Individual facilities */}
            {facilities.map((facility) => (
              <button
                key={facility.id}
                type="button"
                onClick={() => {
                  setSelectedFacilityId(facility.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  selectedFacilityId === facility.id
                    ? "bg-primary/5 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    facility.status === "active"
                      ? "bg-emerald-500"
                      : facility.status === "maintenance"
                        ? "bg-amber-500"
                        : "bg-muted-foreground/30"
                  )}
                />
                <span className="flex-1 truncate">{facility.name}</span>
                <span className="text-[10px] uppercase text-muted-foreground">
                  {facility.type}
                </span>
                {selectedFacilityId === facility.id && (
                  <Check className="size-3.5 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
