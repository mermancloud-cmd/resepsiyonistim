import Link from "next/link";
import { DEMO_WHATSAPP_NUMBER, DEMO_WHATSAPP_MESSAGE } from "@/lib/app-config";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white font-bold text-sm">E</div>
          <span className="font-semibold text-lg">Resepsiyonistim</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Giriş</Link>
          <Link href="/signup" className="text-sm bg-foreground text-background px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">Ücretsiz Dene</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-900/20 px-4 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            Yapay Zeka Destekli Resepsiyonist
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            İşletmenize{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500">
              AI Resepsiyonist
            </span>
            <br />
            Elif Katılıyor
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Bungalov, tiny house ve villa işletmeniz için 7/24 WhatsApp tabanlı yapay zeka resepsiyonisti.
            Misafirlerinizle anında iletişim, otomatik rezervasyon ve akıllı yönetim.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity text-sm"
            >
              Ücretsiz Dene
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=${encodeURIComponent(DEMO_WHATSAPP_MESSAGE)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-xl font-medium hover:bg-muted transition-colors text-sm"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp&apos;ta Dene
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">Elif Ne Yapabilir?</h2>
            <p className="text-muted-foreground mt-2">AI resepsiyonistiniz 7/24 çalışır</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border p-6 space-y-3 hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
                <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-lg">{f.icon}</div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 border-t border-border bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold">Basit Fiyatlandırma</h2>
          <p className="text-muted-foreground mt-2">14 gün ücretsiz deneme, sonra ihtiyacına göre devam et</p>
          <div className="grid md:grid-cols-2 gap-6 mt-10 max-w-2xl mx-auto">
            <div className="rounded-xl border border-border bg-background p-8 space-y-4 text-left">
              <h3 className="text-lg font-semibold">Başlangıç</h3>
              <p className="text-3xl font-bold">₺499<span className="text-sm font-normal text-muted-foreground">/ay</span></p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Aylık 500 AI mesajı</li>
                <li>✓ 1 tesis</li>
                <li>✓ 1 WhatsApp numarası</li>
                <li>✓ Temel rezervasyon yönetimi</li>
              </ul>
              <Link href="/signup" className="block text-center w-full border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors">Başla</Link>
            </div>
            <div className="rounded-xl border-2 border-amber-500 bg-background p-8 space-y-4 text-left relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full">En Popüler</div>
              <h3 className="text-lg font-semibold">Profesyonel</h3>
              <p className="text-3xl font-bold">₺999<span className="text-sm font-normal text-muted-foreground">/ay</span></p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Aylık 5.000 AI mesajı</li>
                <li>✓ 5 tesis</li>
                <li>✓ 3 WhatsApp numarası</li>
                <li>✓ Gelişmiş analitik</li>
                <li>✓ Öncelikli destek</li>
              </ul>
              <Link href="/signup" className="block text-center w-full bg-foreground text-background px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Ücretsiz Başla</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Resepsiyonistim. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}

const features = [
  { icon: "💬", title: "7/24 WhatsApp İletişim", desc: "Misafirleriniz WhatsApp üzerinden Elif ile anında iletişime geçer." },
  { icon: "📅", title: "Akıllı Rezervasyon", desc: "Gelen talepleri değerlendirir, müsaitlik kontrolü yapar ve rezervasyon oluşturur." },
  { icon: "🏠", title: "Tesis Bilgisi", desc: "Oda tipleri, fiyatlar ve konum bilgilerini anında paylaşır." },
  { icon: "🔄", title: "Yönlendirme", desc: "Karmaşık taleplerde sizi haberdar eder, gerektiğinde devralmanızı sağlar." },
  { icon: "📊", title: "Analitik Dashboard", desc: "Tüm konuşmalar, rezervasyonlar ve performans metrikleri tek ekranda." },
  { icon: "🔗", title: "Çoklu Tesis Desteği", desc: "Birden fazla tesisinizi tek panelden yönetin." },
];
