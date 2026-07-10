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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  createClient,
} from "@/lib/supabase/client";
import {
  ArrowLeft,
  Plus,
  Landmark,
  Trash2,
  Star,
  Copy,
  Check,
  Loader2,
  Building2,
  Banknote,
  AlertTriangle,
  Globe,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useBankAccounts,
  useCreateBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
  useSetDefaultBankAccount,
  useToggleBankAccountStatus,
  validateBankAccountInput,
  type BankAccountValidationErrors,
} from "@/hooks/use-bank-accounts";
import { useFacilities } from "@/hooks/use-facilities";
import {
  validateIBAN,
  formatIBAN,
  maskIBAN,
  detectBankFromIBAN,
  getIBANCountry,
} from "@/lib/iban";
import type { BankAccount, BankAccountInput } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "TRY", symbol: "₺", label: "Türk Lirası" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "ABD Doları" },
  { code: "GBP", symbol: "£", label: "İngiliz Sterlini" },
  { code: "CHF", symbol: "₣", label: "İsviçre Frangı" },
  { code: "RUB", symbol: "₽", label: "Rus Rublesi" },
  { code: "AED", symbol: "د.إ", label: "BAE Dirhemi" },
] as const;

// ─── Empty form state ─────────────────────────────────────────────────────────

function emptyForm(): BankAccountInput {
  return {
    bank_name: "",
    branch_name: "",
    account_holder: "",
    iban: "",
    currency: "TRY",
    facility_id: null,
    is_default: false,
    swift_code: "",
    description: "",
  };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function getCurrencySymbol(currency: string): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
}

function detectCurrency(iban: string): string {
  const country = getIBANCountry(iban);
  // Common IBAN-to-currency mappings
  const map: Record<string, string> = {
    TR: "TRY",
    DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
    BE: "EUR", AT: "EUR", PT: "EUR", IE: "EUR", GR: "EUR",
    FI: "EUR", SK: "EUR", SI: "EUR", LT: "EUR", LV: "EUR",
    EE: "EUR", LU: "EUR", MT: "EUR", CY: "EUR", HR: "EUR",
    GB: "GBP",
    US: "USD", // USD doesn't have IBAN but some use it
    CH: "CHF",
    RU: "RUB",
    AE: "AED",
  };
  return map[country] ?? "TRY";
}

// ─── Bank Account Card ────────────────────────────────────────────────────────

function BankAccountCard({
  account,
  onEdit,
  onSetDefault,
  onDelete,
  onToggleStatus,
  isMutating,
  getFacilityName,
}: {
  account: BankAccount;
  onEdit: (a: BankAccount) => void;
  onSetDefault: (id: string) => void;
  onDelete: (a: BankAccount) => void;
  onToggleStatus: (id: string, active: boolean) => void;
  isMutating: boolean;
  getFacilityName: (id: string | null) => string;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCopy = (iban: string) => {
    navigator.clipboard.writeText(iban).catch(() => {});
    setCopiedId(account.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = () => {
    if (deleteConfirmId !== account.id) {
      setDeleteConfirmId(account.id);
      return;
    }
    onDelete(account);
    setDeleteConfirmId(null);
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all",
        account.is_default && "ring-1 ring-primary/30",
        !account.is_active && "opacity-60"
      )}
    >
      <CardContent className="p-0">
        <div className="p-4 space-y-3">
          {/* Header: Bank name + badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Landmark className="size-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate flex items-center gap-1.5">
                  {account.bank_name}
                  {!account.is_active && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                      Pasif
                    </Badge>
                  )}
                </h3>
                {account.branch_name && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {account.branch_name} Şubesi
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {account.is_default && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
                >
                  <Star className="size-2.5" />
                  Varsayılan
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {getCurrencySymbol(account.currency)} {account.currency}
              </Badge>
            </div>
          </div>

          {/* Account holder */}
          <p className="text-xs text-muted-foreground pl-11">
            {account.account_holder}
          </p>

          {/* IBAN display */}
          <div className="flex items-center gap-2 pl-11">
            <code className="text-xs font-mono bg-muted rounded-md px-2.5 py-1.5 flex-1 tracking-wider text-center select-all">
              {maskIBAN(account.iban)}
            </code>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleCopy(account.iban)}
              title="IBAN'ı kopyala"
              className="size-7"
            >
              {copiedId === account.id ? (
                <Check className="size-3.5 text-emerald-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
          </div>

          {/* SWIFT / Facility info */}
          {account.swift_code && (
            <div className="flex items-center gap-1.5 pl-11 text-[11px] text-muted-foreground">
              <Globe className="size-3" />
              <span>SWIFT: {account.swift_code}</span>
            </div>
          )}

          {account.facility_id && (
            <div className="flex items-center gap-1.5 pl-11 text-[11px] text-muted-foreground">
              <Building2 className="size-3" />
              <span>{getFacilityName(account.facility_id)}</span>
            </div>
          )}

          {/* Description */}
          {account.description && (
            <p className="text-[11px] text-muted-foreground pl-11 italic">
              {account.description}
            </p>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-1.5 pt-1 pl-11 flex-wrap">
            <Button
              variant="outline"
              size="xs"
              onClick={() => onEdit(account)}
              disabled={isMutating}
            >
              <Pencil className="size-3" />
              Düzenle
            </Button>

            {!account.is_default && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => onSetDefault(account.id)}
                disabled={isMutating}
              >
                <Star className="size-3" />
                Varsayılan Yap
              </Button>
            )}

            <div className="flex items-center gap-1.5">
              <Switch
                checked={account.is_active}
                onCheckedChange={(checked) =>
                  onToggleStatus(account.id, checked)
                }
                disabled={isMutating}
                aria-label={account.is_active ? "Hesabı pasif yap" : "Hesabı aktif yap"}
              />
              <span className="text-[10px] text-muted-foreground">
                {account.is_active ? "Aktif" : "Pasif"}
              </span>
            </div>

            {/* Delete */}
            {deleteConfirmId === account.id ? (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={handleDelete}
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
                variant="ghost"
                size="xs"
                onClick={handleDelete}
                disabled={isMutating}
                className="text-destructive hover:text-destructive"
                title="Bu banka hesabını sil"
              >
                <Trash2 className="size-3" />
                Sil
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Bank Account Form Dialog ─────────────────────────────────────────────────

function BankAccountFormDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial: BankAccount | null;
}) {
  const createBankAccount = useCreateBankAccount();
  const updateBankAccount = useUpdateBankAccount();
  const { facilities } = useFacilities();
  const [form, setForm] = useState<BankAccountInput>(initial ? {
    bank_name: initial.bank_name,
    branch_name: initial.branch_name ?? "",
    account_holder: initial.account_holder,
    iban: initial.iban,
    currency: initial.currency,
    facility_id: initial.facility_id,
    is_default: initial.is_default,
    swift_code: initial.swift_code ?? "",
    description: initial.description ?? "",
  } : emptyForm());
  const [errors, setErrors] = useState<BankAccountValidationErrors>({});
  const [ibanPreview, setIbanPreview] = useState<string>("");
  const isEditing = !!initial;

  const handleIbanChange = (value: string) => {
    const upper = value.toUpperCase();
    setForm((prev) => ({ ...prev, iban: upper }));

    // Live preview
    if (upper.replace(/\s/g, "").length >= 8) {
      setIbanPreview(formatIBAN(upper));
      // Auto-detect bank name if TR IBAN and bank name is empty
      if (!form.bank_name) {
        const detected = detectBankFromIBAN(upper);
        if (detected) {
          setForm((prev) => ({ ...prev, bank_name: detected }));
        }
      }
      // Auto-detect currency if empty
      if (!isEditing) {
        const detectedCurrency = detectCurrency(upper);
        if (detectedCurrency !== form.currency) {
          setForm((prev) => ({ ...prev, currency: detectedCurrency }));
        }
      }
    } else {
      setIbanPreview("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateBankAccountInput(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    try {
      if (isEditing) {
        await updateBankAccount.mutateAsync({
          id: initial.id,
          bank_name: form.bank_name.trim(),
          branch_name: form.branch_name?.trim() || null,
          account_holder: form.account_holder.trim(),
          iban: form.iban.trim(),
          currency: form.currency,
          facility_id: form.facility_id ?? null,
          swift_code: form.swift_code?.trim() || null,
          description: form.description?.trim() || null,
        });
      } else {
        await createBankAccount.mutateAsync(form);
      }
      onClose();
    } catch {
      // Handled by mutation
    }
  };

  const isPending = createBankAccount.isPending || updateBankAccount.isPending;
  const ibanValidation = form.iban.replace(/\s/g, "").length >= 8
    ? validateIBAN(form.iban)
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Banka Hesabını Düzenle" : "Yeni Banka Hesabı Ekle"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Hesap bilgilerini güncelleyin."
              : "Misafirlerinizin havale/EFT yapabilmesi için banka hesabı ekleyin."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Bank Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bank-name">Banka Adı</Label>
            <Input
              id="bank-name"
              value={form.bank_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bank_name: e.target.value }))
              }
              placeholder="Örn: Ziraat Bankası"
              className={cn(errors.bank_name && "border-destructive")}
            />
            {errors.bank_name && (
              <p className="text-xs text-destructive">{errors.bank_name}</p>
            )}
          </div>

          {/* Branch Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branch-name">Şube Adı (opsiyonel)</Label>
            <Input
              id="branch-name"
              value={form.branch_name ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, branch_name: e.target.value }))
              }
              placeholder="Örn: Merkez Şubesi"
            />
          </div>

          {/* Account Holder */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-holder">Hesap Sahibi</Label>
            <Input
              id="account-holder"
              value={form.account_holder}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  account_holder: e.target.value,
                }))
              }
              placeholder="Örn: Merman Turizm Ltd. Şti."
              className={cn(errors.account_holder && "border-destructive")}
            />
            {errors.account_holder && (
              <p className="text-xs text-destructive">
                {errors.account_holder}
              </p>
            )}
          </div>

          {/* IBAN */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="iban">IBAN Numarası</Label>
            <Input
              id="iban"
              value={form.iban}
              onChange={(e) => handleIbanChange(e.target.value)}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              className={cn(
                "font-mono tracking-wider",
                errors.iban && "border-destructive",
                ibanValidation?.valid && "border-emerald-500"
              )}
            />
            {ibanPreview && (
              <p className="text-[11px] text-muted-foreground font-mono">
                {ibanPreview}
              </p>
            )}
            {errors.iban && (
              <p className="text-xs text-destructive">{errors.iban}</p>
            )}
            {ibanValidation && !ibanValidation.valid && !errors.iban && (
              <p className="text-xs text-amber-600">
                {ibanValidation.errorMessage}
              </p>
            )}
            {ibanValidation?.valid && (
              <p className="text-xs text-emerald-600">✓ Geçerli IBAN</p>
            )}
          </div>

          {/* SWIFT Code */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="swift">SWIFT / BIC Kodu (opsiyonel)</Label>
            <Input
              id="swift"
              value={form.swift_code ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  swift_code: e.target.value.toUpperCase(),
                }))
              }
              placeholder="Örn: TCZBTR2A"
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Uluslararası para transferleri için gereklidir.
            </p>
          </div>

          {/* Currency */}
          <div className="flex flex-col gap-1.5">
            <Label>Para Birimi</Label>
            {errors.currency && (
              <p className="text-xs text-destructive">{errors.currency}</p>
            )}
            <div className="grid grid-cols-4 gap-1.5">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, currency: c.code }))
                  }
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs text-center transition-all",
                    form.currency === c.code
                      ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary/30"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  )}
                >
                  <span className="block text-sm">{c.symbol}</span>
                  <span className="block text-[10px]">{c.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Facility Assignment */}
          {facilities.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label>Tesis (opsiyonel)</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, facility_id: null }))
                  }
                  className={cn(
                    "rounded-lg border p-2 text-xs text-center transition-all",
                    !form.facility_id
                      ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary/30"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  )}
                >
                  <Building2 className="size-4 mx-auto mb-0.5" />
                  Tüm Tesisler
                </button>
                {facilities.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, facility_id: f.id }))
                    }
                    className={cn(
                      "rounded-lg border p-2 text-xs text-center transition-all",
                      form.facility_id === f.id
                        ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary/30"
                        : "border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    <Building2 className="size-4 mx-auto mb-0.5" />
                    {f.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Hangi tesise ait olduğunu belirtmek için kullanılır.
              </p>
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Açıklama (opsiyonel)</Label>
            <Input
              id="description"
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Örn: Kurumsal hesap, ödemeler buraya yapılır"
              maxLength={500}
            />
          </div>

          {/* Actions */}
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
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Kaydediliyor...
                </>
              ) : isEditing ? (
                "Güncelle"
              ) : (
                "Hesap Ekle"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

function DeleteConfirmDialog({
  account,
  open,
  onClose,
}: {
  account: BankAccount | null;
  open: boolean;
  onClose: () => void;
}) {
  const deleteBankAccount = useDeleteBankAccount();

  const handleDelete = async () => {
    if (!account) return;
    try {
      await deleteBankAccount.mutateAsync({ id: account.id });
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
            Banka Hesabını Sil
          </DialogTitle>
          <DialogDescription>
            <strong>{account?.bank_name}</strong> ({account?.account_holder})
            hesabını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            {account?.is_default && (
              <p className="text-amber-600 font-medium mt-2">
                Bu hesap varsayılan hesap olarak işaretli. Silerseniz başka bir
                hesap varsayılan yapılmalıdır.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={deleteBankAccount.isPending}
          >
            İptal
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={deleteBankAccount.isPending}
          >
            {deleteBankAccount.isPending ? "Siliniyor..." : "Evet, Sil"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BankAccountsPage() {
  const router = useRouter();
  const { data: accounts = [], isLoading, error } = useBankAccounts();
  const { getFacilityName } = useFacilities();
  const setDefaultBankAccount = useSetDefaultBankAccount();
  const toggleStatus = useToggleBankAccountStatus();
  const deleteBankAccount = useDeleteBankAccount();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const defaultAccount = accounts.find((a) => a.is_default);
  const activeAccounts = accounts.filter((a) => a.is_active);
  const inactiveCount = accounts.length - activeAccounts.length;

  const filteredAccounts =
    filter === "all"
      ? accounts
      : filter === "active"
        ? accounts.filter((a) => a.is_active)
        : accounts.filter((a) => !a.is_active);

  const handleEdit = (a: BankAccount) => {
    setEditingAccount(a);
    setFormOpen(true);
  };

  const handleSetDefault = async (id: string) => {
    try {
      // We need tenant_id — read from the first account or find it
      const account = accounts.find((a) => a.id === id);
      if (!account) return;
      await setDefaultBankAccount.mutateAsync({
        id,
        tenantId: account.tenant_id,
      });
    } catch {
      // handled by mutation
    }
  };

  const handleDelete = (a: BankAccount) => {
    setDeletingAccount(a);
  };

  const handleToggleStatus = async (id: string, active: boolean) => {
    try {
      await toggleStatus.mutateAsync({ id, is_active: active });
    } catch {
      // handled by mutation
    }
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingAccount(null);
  };

  const isMutating =
    setDefaultBankAccount.isPending ||
    toggleStatus.isPending ||
    deleteBankAccount.isPending;

  return (
    <MobileShell>
      <div className="flex flex-col gap-5 pb-24">
        {/* ─── Page Header ─────────────────────────────────────────────── */}
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
                Banka Hesapları
              </h2>
              <p className="text-xs text-muted-foreground">
                {accounts.length === 0
                  ? "Henüz hesap eklenmemiş"
                  : `${activeAccounts.length} aktif${
                      inactiveCount > 0
                        ? `, ${inactiveCount} pasif hesap`
                        : " hesap"
                    }${defaultAccount ? ` • ${defaultAccount.bank_name} varsayılan` : ""}`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditingAccount(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Yeni Hesap
          </Button>
        </div>

        {/* ─── Summary Card ────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {accounts.length}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Toplam Hesap
                </p>
              </div>
              <div className="border-x border-border/50">
                <p className="text-2xl font-bold text-emerald-600">
                  {activeAccounts.length}
                </p>
                <p className="text-[10px] text-muted-foreground">Aktif</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">
                  {inactiveCount}
                </p>
                <p className="text-[10px] text-muted-foreground">Pasif</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Filter Tabs ─────────────────────────────────────────────── */}
        <div className="flex gap-1.5">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f === "all"
                ? "Tümü"
                : f === "active"
                  ? "Aktif"
                  : "Pasif"}
            </button>
          ))}
        </div>

        {/* ─── Loading State ───────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        )}

        {/* ─── Error State ─────────────────────────────────────────────── */}
        {error && !isLoading && (
          <Card className="border-destructive/50">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
              <AlertTriangle className="size-5 shrink-0" />
              <span>Hesaplar yüklenirken hata oluştu: {error.message}</span>
            </CardContent>
          </Card>
        )}

        {/* ─── Empty State ─────────────────────────────────────────────── */}
        {!isLoading && !error && filteredAccounts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                <Banknote className="size-7 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold mb-1">
                {filter === "all"
                  ? "Henüz Banka Hesabı Yok"
                  : "Bu filtrede Hesap Bulunamadı"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-[240px] mb-4">
                {filter === "all"
                  ? "Misafirlerinizin ödeme yapabilmesi için en az bir banka hesabı ekleyin."
                  : "Filtreyi değiştirerek tüm hesapları görebilirsiniz."}
              </p>
              {filter === "all" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingAccount(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="size-3.5" />
                  İlk Hesabı Ekle
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Account List ────────────────────────────────────────────── */}
        {!isLoading &&
          filteredAccounts.map((account) => (
            <BankAccountCard
              key={account.id}
              account={account}
              onEdit={handleEdit}
              onSetDefault={handleSetDefault}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              isMutating={isMutating}
              getFacilityName={getFacilityName}
            />
          ))}

        {/* ─── Info Card ───────────────────────────────────────────────── */}
        {accounts.length > 0 && (
          <Card className="border-dashed border-primary/30 bg-muted/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Banknote className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium mb-1">
                    IBAN Havale/EFT Bilgisi
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Misafirlerinize rezervasyon onayında varsayılan IBAN
                    hesabınız gönderilir. Birden fazla hesap ekleyerek farklı
                    para birimlerinde ödeme alabilirsiniz.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Dialogs ───────────────────────────────────────────────────── */}
      <BankAccountFormDialog
        open={formOpen}
        onClose={closeForm}
        initial={editingAccount}
      />

      <DeleteConfirmDialog
        account={deletingAccount}
        open={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
      />
    </MobileShell>
  );
}
