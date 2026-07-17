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

      if (rpcError) console.error("Tenant creation failed:", rpcError);

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
      <div className="flex min-h-[100dvh]">
        <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#0f766e] via-[#0c5d56] to-[#094d47] p-12 text-white lg:flex">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-32 -left-12 h-96 w-96 rounded-full bg-[#f5a623]/10 blur-3xl" />
          </div>
          <Link href="/" className="relative z-10 flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <span className="font-serif text-2xl">R</span>
            </div>
            <span className="font-serif text-xl">Resepsiyonistim</span>
          </Link>
          <div className="relative z-10 space-y-6">
            <h2 className="font-serif text-3xl leading-tight">Hoş geldin.</h2>
            <p className="max-w-md text-white/70">İşletmen için dijital resepsiyonistini hazırla, 14 gün ücretsiz dene.</p>
          </div>
          <p className="relative z-10 text-xs text-white/40">© 2026 Resepsiyonistim</p>
        </div>

        <div className="flex w-full items-center justify-center bg-[#faf9f6] px-6 py-12 lg:w-1/2">
          <div className="w-full max-w-sm space-y-6 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50">
              <CheckCircle className="size-8 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h1 className="font-serif text-2xl text-[#1a2f2d]">Kayıt Başarılı!</h1>
              <p className="text-sm text-[#6b7f7d]">
                E-posta adresinize gönderilen doğrulama linkine tıklayın, ardından giriş yaparak kuruluma başlayın.
              </p>
            </div>
            <Button className="h-11 w-full bg-[#0f766e] hover:bg-[#0c5d56]" size="lg" onClick={() => router.push("/login")}>
              Giriş Yap
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh]">
      {/* Left: Branding */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#0f766e] via-[#0c5d56] to-[#094d47] p-12 text-white lg:flex">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -left-12 h-96 w-96 rounded-full bg-[#f5a623]/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <span className="font-serif text-2xl">R</span>
            </div>
            <span className="font-serif text-xl">Resepsiyonistim</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="font-serif text-3xl leading-tight">
            14 gün ücretsiz dene.
          </h2>
          <p className="max-w-md text-white/70">
            Kredi kartı gerekmez. İşletmeni kaydet, dijital resepsiyonistini platforma bağla, müşterilerinle sohbet etmeye başla.
          </p>
          <div className="flex gap-6 pt-4">
            <div>
              <div className="font-serif text-2xl">2 dk</div>
              <div className="text-xs text-white/50">Kurulum</div>
            </div>
            <div>
              <div className="font-serif text-2xl">14 gün</div>
              <div className="text-xs text-white/50">Ücretsiz</div>
            </div>
            <div>
              <div className="font-serif text-2xl">WhatsApp</div>
              <div className="text-xs text-white/50">Entegre</div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">© 2026 Resepsiyonistim</p>
      </div>

      {/* Right: Form */}
      <div className="flex w-1/2 items-center justify-center bg-[#faf9f6] px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f766e] to-[#0c5d56] text-white">
                <span className="font-serif text-2xl">R</span>
              </div>
            </Link>
          </div>

          <h1 className="font-serif text-2xl text-[#1a2f2d]">Hesap oluştur</h1>
          <p className="mt-1.5 text-sm text-[#6b7f7d]">
            14 gün ücretsiz deneme ile başla.
          </p>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#1a2f2d]">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aaca9]" />
                <input id="email" type="email" placeholder="ornek@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#e0ddd5] bg-white pl-9 pr-3 text-sm text-[#1a2f2d] placeholder:text-[#9aaca9] transition-colors duration-150 focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20"
                  autoFocus disabled={loading} autoComplete="email" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#1a2f2d]">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aaca9]" />
                <input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#e0ddd5] bg-white pl-9 pr-9 text-sm text-[#1a2f2d] placeholder:text-[#9aaca9] transition-colors duration-150 focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20"
                  disabled={loading} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aaca9] hover:text-[#1a2f2d]" tabIndex={-1}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-[#1a2f2d]">Telefon</label>
              <div className="flex items-center gap-2">
                <span className="flex h-11 items-center rounded-lg border border-[#e0ddd5] bg-[#f5f4f0] px-3 text-sm text-[#6b7f7d]">+90</span>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aaca9]" />
                  <input id="phone" type="tel" inputMode="numeric" placeholder="5XX XXX XX XX"
                    value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="h-11 w-full rounded-lg border border-[#e0ddd5] bg-white pl-9 pr-3 text-sm text-[#1a2f2d] placeholder:text-[#9aaca9] transition-colors duration-150 focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20"
                    disabled={loading} maxLength={10} autoComplete="tel-national" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="business-name" className="mb-1.5 block text-sm font-medium text-[#1a2f2d]">İşletme Adı</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aaca9]" />
                <input id="business-name" type="text" placeholder="örn: Yeşil Vadi Bungalov"
                  value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#e0ddd5] bg-white pl-9 pr-3 text-sm text-[#1a2f2d] placeholder:text-[#9aaca9] transition-colors duration-150 focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20"
                  disabled={loading} autoComplete="organization" />
              </div>
            </div>

            <Button type="submit" size="lg"
              disabled={loading || !email || password.length < 6 || businessName.trim().length < 2}
              className="h-11 w-full bg-[#0f766e] hover:bg-[#0c5d56]">
              {loading ? <><Loader2 className="mr-2 size-4 animate-spin" /> Kayıt yapılıyor…</>
                : <><CheckCircle className="mr-2 size-4" /> Kayıt Ol ve Başla</>}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#6b7f7d]">
            Zaten hesabın var mı?{" "}
            <Link href="/login" className="font-medium text-[#0f766e] hover:underline">Giriş Yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
}