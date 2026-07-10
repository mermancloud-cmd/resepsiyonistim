"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentNotificationFormProps {
  tenantId: string;
  planId: string;
  amount: number;
  onSuccess?: () => void;
}

export function PaymentNotificationForm({
  tenantId,
  planId,
  amount,
  onSuccess,
}: PaymentNotificationFormProps) {
  const supabase = createClient();
  const [ibanLast4, setIbanLast4] = useState("");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  type PaymentResult =
    | { type: "success"; reference: string }
    | { type: "error"; error: string }
    | null;
  const [result, setResult] = useState<PaymentResult>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.size > 5 * 1024 * 1024) {
        setResult({
          type: "error",
          error: "Dekont dosyası en fazla 5MB olabilir.",
        });
        return;
      }
      setReceiptFile(file ?? null);
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ibanLast4 || ibanLast4.length < 4) {
      setResult({ type: "error", error: "IBAN son 4 hanesi zorunludur." });
      return;
    }
    if (!bankName.trim()) {
      setResult({ type: "error", error: "Banka adı zorunludur." });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      // 1. Upload receipt if provided
      let receiptUrl: string | null = null;
      if (receiptFile) {
        const fileExt = receiptFile.name.split(".").pop();
        const filePath = `payment-receipts/${tenantId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-receipts")
          .upload(filePath, receiptFile);

        if (uploadError) {
          setResult({
            type: "error",
            error: `Dekont yüklenemedi: ${uploadError.message}`,
          });
          setSubmitting(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("payment-receipts")
          .getPublicUrl(filePath);
        receiptUrl = urlData?.publicUrl ?? null;
      }

      // 2. Generate reference code
      const referenceCode = `IBAN-${Date.now().toString(36).toUpperCase()}-${tenantId.slice(0, 4).toUpperCase()}`;

      // 3. Insert payment record
      const { error: insertError } = await supabase
        .from("subscription_iban_payments")
        .insert({
          tenant_id: tenantId,
          plan_id: planId,
          amount,
          iban_last4: ibanLast4,
          bank_name: bankName.trim(),
          reference_code: referenceCode,
          receipt_url: receiptUrl,
          notes: notes.trim() || null,
          status: "pending",
        });

      if (insertError) {
        setResult({
          type: "error",
          error: `Kayıt hatası: ${insertError.message}`,
        });
        setSubmitting(false);
        return;
      }

      setResult({ type: "success", reference: referenceCode });

      // Reset form
      setIbanLast4("");
      setBankName("");
      setNotes("");
      setReceiptFile(null);

      onSuccess?.();
    } catch (err) {
      setResult({
        type: "error",
        error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.type === "success") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/10 dark:border-emerald-800 p-6 text-center space-y-3">
        <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
        <h4 className="font-semibold text-lg">Ödeme Bildirimi Alındı</h4>
        <p className="text-sm text-muted-foreground">
          Referans kodunuz:{" "}
          <span className="font-mono font-bold text-foreground">
            {result.reference}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Ödemeniz en kısa sürede onaylanacaktır. Bu referans kodunu
          kaydetmeniz önerilir.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setResult(null)}
        >
          Yeni Bildirim
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="font-semibold text-sm">Dekont Bildirimi</h4>
      <p className="text-xs text-muted-foreground">
        Havale/EFT yaptıktan sonra aşağıdaki formu doldurarak ödemenizi
        bildirin.
      </p>

      {result?.type === "error" && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <p>{result.error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="iban-last4" className="text-xs">
            IBAN Son 4 Hane *
          </Label>
          <Input
            id="iban-last4"
            value={ibanLast4}
            onChange={(e) => setIbanLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
            maxLength={4}
            className="h-9 text-sm font-mono tracking-wider"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bank-name" className="text-xs">
            Banka Adı *
          </Label>
          <Input
            id="bank-name"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Türkiye İş Bankası"
            className="h-9 text-sm"
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="receipt" className="text-xs">
          Dekont (opsiyonel, max 5MB)
        </Label>
        <label
          htmlFor="receipt"
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-sm transition-colors",
            receiptFile
              ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          {receiptFile ? (
            <>
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span className="text-muted-foreground">{receiptFile.name}</span>
            </>
          ) : (
            <>
              <Upload className="size-4" />
              <span className="text-muted-foreground">
                Dekontu seçmek için tıklayın
              </span>
            </>
          )}
        </label>
        <input
          id="receipt"
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes" className="text-xs">
          Açıklama (opsiyonel)
        </Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="İşletme adı, fatura notu vb."
          className="h-9 text-sm"
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Gönderiliyor…
          </>
        ) : (
          <>
            <CheckCircle2 className="size-4" />
            Ödeme Bildirimini Gönder
          </>
        )}
      </Button>
    </form>
  );
}
