"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Phone, Building2, Loader2, CheckCircle, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) { setError("Geçerli bir e-posta girin."); return; }
    if (password.length < 6) { setError("Şifre en az 6 karakter olmalı."); return; }
    if (businessName.trim().length < 2) { setError("İşletme adı en az 2 karakter."); return; }

    setLoading(true);
    try {
      const { data, error: signUpError } = await signUp(email, password, {
        business_name: businessName,
        phone: phone,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError("Kayıt başarısız. Lütfen tekrar deneyin.");
        setLoading(false);
        return;
      }

      const { error: rpcError } = await supabase.rpc("signup_tenant", {
        p_business_name: businessName.trim(),
        p_phone: phone.replace(/\D/g, ""),
        p_plan_id: "pro",
      });

      if (rpcError) {
        console.error("Tenant creation failed:", rpcError);
      }

      setStep("success");
    } catch (err: unknown) {
      const es = err as Record<string, unknown>;
      setError(typeof es?.message === "string" ? es.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-background to-primary/5">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
            <CheckCircle className="size-8 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Kayıt Başarılı!</h1>
            <p className="text-sm text-muted-foreground">
              İşletmeniz oluşturuldu. <strong>14 günlük ücretsiz deneme</strong> süreniz başladı.
            </p>
            <p className="text-xs text-muted-foreground/70">
              E-posta adresinize gönderilen doğrulama linkine tıklayın, ardından giriş yaparak kuruluma başlayın.
            </p>
          </div>
          <Button className="w-full" size="lg" onClick={() => router.push("/login?reason=signed_up")}>
            Giriş Yap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">Hesap Oluştur</h1>
        <p className="mt-1 text-sm text-muted-foreground">14 gün ücretsiz deneme ile başlayın</p>
      </div>

      {error && (
        <div className="mb-4 flex w-full max-w-sm items-start gap-2.5 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">E-posta</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input id="email" type="email" placeholder="ornek@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground"
                autoFocus disabled={loading} autoComplete="email" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-9 text-sm text-foreground"
                disabled={loading} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">Telefon</label>
            <div className="flex items-center gap-2">
              <span className="flex h-10 items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground">+90</span>
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input id="phone" type="tel" inputMode="numeric" placeholder="5XX XXX XX XX"
                  value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground"
                  disabled={loading} maxLength={10} autoComplete="tel-national" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="business-name" className="mb-1.5 block text-sm font-medium">İşletme Adı</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input id="business-name" type="text" placeholder="örn: Yeşil Vadi Bungalov"
                value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground"
                disabled={loading} autoComplete="organization" />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg"
            disabled={loading || !email || password.length < 6 || businessName.trim().length < 2}>
            {loading ? <><Loader2 className="mr-2 size-4 animate-spin" /> Kayıt yapılıyor…</>
              : <><CheckCircle className="mr-2 size-4" /> Kayıt Ol ve Başla</>}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">Giriş Yap</Link>
      </p>
    </div>
  );
}
