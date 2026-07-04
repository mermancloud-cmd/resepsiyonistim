"use client";

import * as React from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Landmark,
  Plus,
  Trash2,
  Star,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OwnerIBAN, NewIBANInput } from "@/hooks/use-owner-ibans";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function maskIBAN(iban: string): string {
  if (iban.length <= 8) return iban;
  const first4 = iban.slice(0, 4);
  const last4 = iban.slice(-4);
  return `${first4} ···· ···· ${last4}`;
}

const currencySymbol: Record<string, string> = {
  TRY: "₺",
  EUR: "€",
  USD: "$",
  GBP: "£",
};

const supportedCurrencies = ["TRY", "EUR", "USD", "GBP"] as const;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface IbanDetailsFormProps {
  ibans: OwnerIBAN[];
  isLoading?: boolean;
  onAdd: (input: NewIBANInput) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string, wasDefault: boolean) => void;
  isAdding?: boolean;
  isMutating?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function IbanDetailsForm({
  ibans,
  isLoading,
  onAdd,
  onSetDefault,
  onDelete,
  isAdding,
  isMutating,
}: IbanDetailsFormProps) {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  // New IBAN form state
  const [newBank, setNewBank] = React.useState("");
  const [newHolder, setNewHolder] = React.useState("");
  const [newIban, setNewIban] = React.useState("");
  const [newCurrency, setNewCurrency] = React.useState<string>("TRY");

  const resetForm = () => {
    setNewBank("");
    setNewHolder("");
    setNewIban("");
    setNewCurrency("TRY");
    setShowAddForm(false);
  };

  const handleAdd = () => {
    const trimmed = newIban.replace(/\s/g, "").toUpperCase();
    if (!newBank.trim() || !newHolder.trim() || trimmed.length < 8) return;

    onAdd({
      bank_name: newBank.trim(),
      account_holder: newHolder.trim(),
      iban: trimmed,
      currency: newCurrency,
    });
    resetForm();
  };

  const handleSetDefault = (id: string) => {
    onSetDefault(id);
  };

  const handleDelete = (iban: OwnerIBAN) => {
    if (deleteConfirmId !== iban.id) {
      setDeleteConfirmId(iban.id);
      return;
    }
    onDelete(iban.id, iban.is_default);
    setDeleteConfirmId(null);
  };

  const handleCopy = (iban: OwnerIBAN) => {
    navigator.clipboard.writeText(iban.iban).catch(() => {});
    setCopiedId(iban.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isFormValid =
    newBank.trim().length > 0 &&
    newHolder.trim().length > 0 &&
    newIban.replace(/\s/g, "").length >= 8;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="size-5 text-primary" />
          IBAN Hesaplarım
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {ibans.length} hesap
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* ── Loading state ─────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!isLoading && ibans.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <Landmark className="size-8 mx-auto mb-2 opacity-40" />
            <p>Henüz IBAN hesabı eklenmemiş.</p>
            <p className="text-xs mt-1">
              Misafirlerinizin ödeme yapabilmesi için en az bir IBAN ekleyin.
            </p>
          </div>
        )}

        {/* ── Existing IBAN list ────────────────────────────────────── */}
        {!isLoading &&
          ibans.map((iban) => (
            <div
              key={iban.id}
              className={cn(
                "rounded-lg border p-3 space-y-2.5 transition-colors",
                iban.is_default
                  ? "border-primary/30 bg-primary/[0.03]"
                  : "border-border"
              )}
            >
              {/* Row 1: bank name + badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Landmark className="size-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm truncate">
                    {iban.bank_name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {iban.is_default && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
                    >
                      <Star className="size-2.5" />
                      Varsayılan
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {currencySymbol[iban.currency] ?? iban.currency}{" "}
                    {iban.currency}
                  </Badge>
                </div>
              </div>

              {/* Row 2: account holder */}
              <p className="text-xs text-muted-foreground pl-6">
                {iban.account_holder}
              </p>

              {/* Row 3: masked IBAN + copy */}
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-muted rounded-md px-2.5 py-1.5 flex-1 tracking-wider text-center select-all">
                  {maskIBAN(iban.iban)}
                </code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleCopy(iban)}
                  title="IBAN numarasını kopyala"
                >
                  {copiedId === iban.id ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>

              {/* Row 4: actions */}
              <div className="flex gap-1.5 pt-0.5">
                {!iban.is_default && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleSetDefault(iban.id)}
                    disabled={isMutating}
                  >
                    <Star className="size-3" />
                    Varsayılan Yap
                  </Button>
                )}
                {deleteConfirmId === iban.id ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="destructive"
                      size="xs"
                      onClick={() => handleDelete(iban)}
                      disabled={isMutating}
                    >
                      <Trash2 className="size-3" />
                      Silmeyi Onayla
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      Vazgeç
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => handleDelete(iban)}
                    disabled={ibans.length <= 1 || isMutating}
                    title={
                      ibans.length <= 1
                        ? "En az bir IBAN hesabı bulunmalıdır"
                        : "Bu IBAN hesabını sil"
                    }
                  >
                    <Trash2 className="size-3" />
                    Sil
                  </Button>
                )}
              </div>
            </div>
          ))}

        {/* ── Add new IBAN form ──────────────────────────────────────── */}
        {showAddForm ? (
          <div className="rounded-lg border border-dashed border-primary/30 p-3 space-y-3 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Yeni IBAN Hesabı
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="bank-name" className="text-xs">
                Banka Adı
              </Label>
              <Input
                id="bank-name"
                placeholder="Örn: Ziraat Bankası"
                value={newBank}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewBank(e.target.value)
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account-holder" className="text-xs">
                Hesap Sahibi
              </Label>
              <Input
                id="account-holder"
                placeholder="Örn: Şirket Adı veya Kişi Adı"
                value={newHolder}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewHolder(e.target.value)
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="iban-number" className="text-xs">
                IBAN Numarası
              </Label>
              <Input
                id="iban-number"
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                value={newIban}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewIban(e.target.value.toUpperCase())
                }
                className="font-mono tracking-wider"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Para Birimi</Label>
              <div className="flex flex-wrap gap-1.5">
                {supportedCurrencies.map((c) => (
                  <Button
                    key={c}
                    variant={newCurrency === c ? "default" : "outline"}
                    size="xs"
                    onClick={() => setNewCurrency(c)}
                    type="button"
                  >
                    {currencySymbol[c]} {c}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleAdd}
                disabled={!isFormValid || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Ekle
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                İptal
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="size-3.5" />
            Yeni IBAN Hesabı Ekle
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
