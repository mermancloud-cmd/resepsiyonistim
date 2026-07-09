"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Building2, Edit3, Trash2, MapPin, Phone, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useFacilities,
  useCreateFacility,
  useUpdateFacility,
  useDeleteFacility,
} from "@/hooks/use-facilities";
import type { Facility, FacilityType } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const FACILITY_TYPES: { value: FacilityType; label: string }[] = [
  { value: "hotel", label: "Otel" },
  { value: "villa", label: "Villa" },
  { value: "bungalov", label: "Bungalov" },
  { value: "apart", label: "Apart" },
  { value: "pansiyon", label: "Pansiyon" },
  { value: "glamping", label: "Glamping" },
  { value: "tinyhouse", label: "Tiny House" },
  { value: "diger", label: "Diğer" },
];

const FACILITY_STATUS_LABELS: Record<string, { label: string; color: string }> =
  {
    active: { label: "Aktif", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
    inactive: { label: "Pasif", color: "text-muted-foreground bg-muted" },
    maintenance: {
      label: "Bakımda",
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    },
  };

// ─── Slugify helper ───────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9çşğüöı]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Form State ───────────────────────────────────────────────────────────────

interface FacilityFormData {
  name: string;
  slug: string;
  type: FacilityType;
  address: string;
  phone: string;
}

const emptyForm = (): FacilityFormData => ({
  name: "",
  slug: "",
  type: "bungalov",
  address: "",
  phone: "",
});

function validateFacilityForm(data: FacilityFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.name.trim()) errors.name = "Tesis adı zorunludur";
  if (!data.slug.trim()) errors.slug = "Slug zorunludur";
  else if (!/^[a-z0-9-]+$/.test(data.slug))
    errors.slug = "Slug yalnızca küçük harf, rakam ve tire içerebilir";
  return errors;
}

// ─── Facility Card ────────────────────────────────────────────────────────────

function FacilityCard({
  facility,
  onEdit,
  onDelete,
}: {
  facility: Facility;
  onEdit: (f: Facility) => void;
  onDelete: (f: Facility) => void;
}) {
  const statusInfo = FACILITY_STATUS_LABELS[facility.status] ?? {
    label: facility.status,
    color: "text-muted-foreground bg-muted",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">
                {facility.name}
              </h3>
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0", statusInfo.color)}
              >
                {statusInfo.label}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground mt-0.5">
              {FACILITY_TYPES.find((t) => t.value === facility.type)?.label ??
                facility.type}
            </p>

            {facility.address && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{facility.address}</span>
              </div>
            )}

            {facility.phone && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <Phone className="size-3 shrink-0" />
                <span>{facility.phone}</span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => onEdit(facility)}
              >
                <Edit3 className="size-3" />
                Düzenle
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                onClick={() => onDelete(facility)}
              >
                <Trash2 className="size-3" />
                Sil
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Facility Form (Dialog) ───────────────────────────────────────────────────

function FacilityFormDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial: Facility | null;
}) {
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const [form, setForm] = useState<FacilityFormData>(
    initial
      ? {
          name: initial.name,
          slug: initial.slug,
          type: initial.type,
          address: initial.address ?? "",
          phone: initial.phone ?? "",
        }
      : emptyForm()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditing = !!initial;

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: isEditing ? prev.slug : slugify(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateFacilityForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    try {
      if (isEditing) {
        await updateFacility.mutateAsync({
          id: initial.id,
          name: form.name.trim(),
          slug: form.slug.trim(),
          type: form.type,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
        });
      } else {
        await createFacility.mutateAsync({
          name: form.name.trim(),
          slug: form.slug.trim(),
          type: form.type,
          address: form.address.trim() || undefined,
          phone: form.phone.trim() || undefined,
        });
      }
      onClose();
    } catch {
      // Error is handled by the mutation's error state
    }
  };

  const isPending = createFacility.isPending || updateFacility.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Tesisi Düzenle" : "Yeni Tesis Ekle"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Tesis bilgilerini güncelleyin."
              : "Yeni bir tesis ekleyerek çoklu tesis yönetimine başlayın."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="facility-name">Tesis Adı</Label>
            <Input
              id="facility-name"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Örn: Merman Bungalov - Şube 1"
              className={cn(errors.name && "border-destructive")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Slug */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="facility-slug">Slug (URL)</Label>
            <Input
              id="facility-slug"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
              placeholder="ornek-slug"
              className={cn("font-mono text-xs", errors.slug && "border-destructive")}
            />
            {errors.slug && (
              <p className="text-xs text-destructive">{errors.slug}</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Otomatik oluşturulur, ihtiyaç halinde değiştirebilirsiniz.
            </p>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label>Tesis Türü</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {FACILITY_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, type: t.value }))}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-xs text-center transition-all",
                    form.type === t.value
                      ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary/30"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="facility-address">Adres (opsiyonel)</Label>
            <Input
              id="facility-address"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Tesis adresi"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="facility-phone">Telefon (opsiyonel)</Label>
            <Input
              id="facility-phone"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+90 242 555 1234"
              type="tel"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              İptal
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending
                ? "Kaydediliyor..."
                : isEditing
                  ? "Güncelle"
                  : "Tesis Ekle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

function DeleteConfirmDialog({
  facility,
  open,
  onClose,
}: {
  facility: Facility | null;
  open: boolean;
  onClose: () => void;
}) {
  const deleteFacility = useDeleteFacility();

  const handleDelete = async () => {
    if (!facility) return;
    try {
      await deleteFacility.mutateAsync(facility.id);
      onClose();
    } catch {
      // handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Tesisi Sil
          </DialogTitle>
          <DialogDescription>
            <strong>{facility?.name}</strong> tesisini silmek istediğinize emin
            misiniz? Bu işlem geri alınamaz. Tesise ait oda ve rezervasyonlar
            tesis bağlantısını kaybeder ancak silinmez.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={deleteFacility.isPending}
          >
            İptal
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={deleteFacility.isPending}
          >
            {deleteFacility.isPending ? "Siliniyor..." : "Evet, Sil"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FacilitiesPage() {
  const router = useRouter();
  const { facilities, isLoading, error, count } = useFacilities();
  const [formOpen, setFormOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [deletingFacility, setDeletingFacility] = useState<Facility | null>(null);

  const handleEdit = (f: Facility) => {
    setEditingFacility(f);
    setFormOpen(true);
  };

  const handleDelete = (f: Facility) => {
    setDeletingFacility(f);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingFacility(null);
  };

  return (
    <MobileShell>
      <div className="flex flex-col gap-5 pb-20">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="touch-target rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Ayarlara dön"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Tesis Yönetimi
              </h2>
              <p className="text-xs text-muted-foreground">
                {count} tesis{" "}
                {count > 1 ? "yönetiyorsunuz" : "yönetiyorsunuz"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditingFacility(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Yeni Tesis
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <Card className="border-destructive/50">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
              <XCircle className="size-5 shrink-0" />
              <span>Tesisler yüklenirken hata oluştu: {error}</span>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && facilities.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Building2 className="size-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Henüz tesis eklenmemiş
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  İlk tesisinizi ekleyerek çoklu tesis yönetimine başlayın.
                </p>
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setEditingFacility(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" />
                İlk Tesisi Ekle
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Facility list */}
        {!isLoading && facilities.length > 0 && (
          <div className="flex flex-col gap-3">
            {facilities.map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Info card */}
        {count > 0 && (
          <Card className="bg-muted/30">
            <CardContent className="p-3 text-xs text-muted-foreground">
              <p>
                Tesisler ana sayfadaki tesis seçiciden hızlıca
                değiştirilebilir. Her tesisin kendi odaları, fiyatları ve
                rezervasyonları bulunur.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <FacilityFormDialog
        open={formOpen}
        onClose={closeForm}
        initial={editingFacility}
      />
      <DeleteConfirmDialog
        facility={deletingFacility}
        open={!!deletingFacility}
        onClose={() => setDeletingFacility(null)}
      />
    </MobileShell>
  );
}
