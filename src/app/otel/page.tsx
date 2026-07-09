import Link from "next/link";
import { DEMO_WHATSAPP_NUMBER, DEMO_WHATSAPP_MESSAGE } from "@/lib/app-config";

export default function OtelPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#f7f3ee] via-white to-[#f0ebe4]">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full relative z-30">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-amber-200/50">
            R
          </div>
          <span
            className="font-semibold text-xl"
            style={{ fontFamily: "var(--font-heading)", color: "#1a2e2a" }}
          >
            Resepsiyonistim
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-teal-800/70 hover:text-teal-900 transition-colors px-3 py-2"
          >
            Giriş
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold bg-gradient-to-r from-teal-700 to-teal-600 text-white px-5 py-2.5 rounded-xl hover:from-teal-800 hover:to-teal-700 transition-all shadow-sm"
          >
            Ücretsiz Dene
          </Link>
        </nav>
      </header>

      {/* ─── HERO ─── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center relative overflow-hidden">
        {/* Arkaplan: otel silueti */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <svg
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] h-auto opacity-[0.055] md:opacity-[0.07]"
            viewBox="0 0 800 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: "blur(1px)" }}
          >
            {/* Zemin */}
            <rect x="0" y="500" width="800" height="100" fill="#1a2e2a" />
            {/* Otel ana blok */}
            <rect x="100" y="250" width="600" height="250" rx="6" fill="#1a2e2a" />
            {/* Kat bantları */}
            <rect x="100" y="340" width="600" height="4" fill="#f7f3ee" opacity="0.08" />
            <rect x="100" y="420" width="600" height="4" fill="#f7f3ee" opacity="0.08" />
            {/* Giriş */}
            <rect x="340" y="410" width="120" height="90" rx="4" fill="#f7f3ee" opacity="0.12" />
            {/* Pencereler - 1.kat */}
            {[160, 240, 320, 440, 520, 600].map((x) => (
              <rect key={`w1-${x}`} x={x} y="270" width="50" height="55" rx="3" fill="#f7f3ee" opacity="0.1" />
            ))}
            {/* Pencereler - 2.kat */}
            {[160, 240, 320, 440, 520, 600].map((x) => (
              <rect key={`w2-${x}`} x={x} y="360" width="50" height="50" rx="3" fill="#f7f3ee" opacity="0.1" />
            ))}
            {/* Çatı dekorasyonu */}
            <rect x="180" y="240" width="440" height="12" rx="2" fill="#f7f3ee" opacity="0.06" />
            {/* Bayrak direği */}
            <rect x="390" y="140" width="4" height="110" fill="#1a2e2a" />
            <polygon points="395,145 440,160 395,175" fill="#1a2e2a" />
            {/* Çam ağaçları */}
            <polygon points="60,430 80,330 100,430" fill="#1a2e2a" />
            <polygon points="55,380 80,290 105,380" fill="#1a2e2a" />
            <polygon points="700,430 720,350 740,430" fill="#1a2e2a" />
            <polygon points="695,390 720,310 745,390" fill="#1a2e2a" />
            {/* Yıldızlar */}
            <circle cx="150" cy="70" r="2" fill="#1a2e2a" opacity="0.3" />
            <circle cx="350" cy="45" r="1.5" fill="#1a2e2a" opacity="0.25" />
            <circle cx="550" cy="65" r="2" fill="#1a2e2a" opacity="0.3" />
            <circle cx="680" cy="35" r="1.5" fill="#1a2e2a" opacity="0.2" />
            <circle cx="250" cy="100" r="1" fill="#1a2e2a" opacity="0.2" />
          </svg>
        </div>

        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 size-80 rounded-full bg-amber-300/15 blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 size-[28rem] rounded-full bg-teal-300/15 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto space-y-9 relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-sm border border-amber-200/50 px-4 py-1.5 text-xs font-medium text-amber-800 shadow-sm">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            Otel &amp; Pansiyon İşletmeleri İçin
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-[#1a2e2a] max-w-3xl mx-auto">
            Otelinize 7/24
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 block mt-2">
              Dijital Resepsiyonist
            </span>
          </h1>

          <p className="text-base md:text-lg text-teal-800/70 max-w-xl mx-auto leading-relaxed">
            Misafirleriniz WhatsApp&rsquo;tan yazar, resepsiyonistiniz anında
            yanıtlar. <strong className="text-teal-900 font-semibold">Otel
            doluluğunuzu artırır</strong>, rezervasyonları otomatik alır,
            check-in/check-out süreçlerini yönetir.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-teal-800 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-teal-900 transition-all shadow-md text-base hover:-translate-y-0.5 hover:shadow-lg"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Ücretsiz Dene
            </Link>
            <a
              href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=${encodeURIComponent(DEMO_WHATSAPP_MESSAGE)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-3 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white px-9 py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-300/40 hover:shadow-xl hover:shadow-emerald-300/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out" />
              <span className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <svg className="size-6 relative z-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
              </svg>
              <span className="relative z-10">
                <span className="block text-sm font-normal opacity-80 leading-tight">Hemen Dene</span>
                <span className="block text-lg leading-tight">Canlı Gör &rarr;</span>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── ÖZELLİKLER (Otel/Sektör) ─── */}
      <section className="px-6 py-20 md:py-28 bg-gradient-to-b from-white/80 via-white to-white/80 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a2e2a]">
              Otellere Özel Çözümler
            </h2>
            <p className="text-teal-800/60 mt-3 max-w-md mx-auto text-base">
              Küçük butik otelden büyük pansiyona, her ölçekte işletmeye uygun dijital resepsiyonist
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {otelFeatures.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-teal-100/60 bg-white/60 backdrop-blur-sm p-7 space-y-4 hover:border-amber-200/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                <div className="size-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-2xl shadow-sm border border-amber-200/40 relative z-10">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg text-teal-900 relative z-10" style={{ fontFamily: "var(--font-heading)" }}>
                  {f.title}
                </h3>
                <p className="text-sm text-teal-700/70 leading-relaxed relative z-10">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FİYATLANDIRMA REFERANSI ─── */}
      <section className="px-6 py-16 md:py-20 bg-white relative">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a2e2a]">Basit Fiyatlandırma</h2>
            <p className="text-teal-800/60 mt-3 max-w-md mx-auto text-base">
              Oteliniz büyüdükçe planınızı yükseltin, ihtiyacınız kadar ödeyin
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-7 space-y-4 transition-all duration-300 ${
                  plan.popular
                    ? "border-amber-300 bg-gradient-to-b from-amber-50/60 to-white shadow-lg shadow-amber-100/50 scale-[1.03] relative"
                    : "border-teal-100/60 bg-white/80 hover:shadow-md"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                    En Çok Tercih Edilen
                  </div>
                )}
                <h3 className="font-bold text-lg text-teal-900" style={{ fontFamily: "var(--font-heading)" }}>
                  {plan.name}
                </h3>
                <p className="text-3xl font-bold text-[#1a2e2a]">
                  {plan.price}
                  <span className="text-sm font-normal text-teal-600 ml-1">/ay</span>
                </p>
                <ul className="space-y-2 text-sm text-teal-700/70">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <svg className="size-4 text-emerald-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block text-center font-semibold px-5 py-3 rounded-xl transition-all text-sm ${
                    plan.popular
                      ? "bg-teal-800 text-white hover:bg-teal-900 shadow-md"
                      : "border border-teal-200 text-teal-800 hover:bg-teal-50"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-teal-500/60 mt-8">
            Tüm planlar 14 gün ücretsiz deneme içerir. Sözleşme yok, dilediğiniz zaman iptal.
          </p>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-6 py-20 md:py-28 bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] size-[400px] rounded-full bg-amber-400/5 blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] size-[300px] rounded-full bg-white/5 blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="otel-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#otel-grid)" />
          </svg>
        </div>
        <div className="max-w-2xl mx-auto space-y-8 relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">Oteliniz İçin Dijital Resepsiyonist Zamanı</h2>
          <p className="text-teal-100/80 text-base md:text-lg max-w-lg mx-auto">
            Şimdilik test aşamasındayız. Ama resepsiyonistinizin nasıl konuştuğunu görmek için hemen deneyin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-amber-500 text-amber-950 px-7 py-3.5 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 text-base hover:-translate-y-0.5"
            >
              Ücretsiz Dene
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=${encodeURIComponent(DEMO_WHATSAPP_MESSAGE)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-white/10 text-white border border-white/20 px-6 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-all hover:-translate-y-0.5"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
              </svg>
              Canlı Gör
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="px-6 py-12 bg-[#1a2e2a] text-center">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-3">
          <span className="size-6 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-xs">R</span>
          <span className="font-semibold text-teal-200 text-base" style={{ fontFamily: "var(--font-heading)" }}>Resepsiyonistim</span>
        </Link>
        <p className="text-teal-400/50 text-xs">&copy; {new Date().getFullYear()} Resepsiyonistim. Tüm hakları saklıdır.</p>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-teal-500/50">
          <Link href="/" className="hover:text-teal-300 transition-colors">Ana Sayfa</Link>
          <Link href="/villa" className="hover:text-teal-300 transition-colors">Villa</Link>
          <Link href="/apart" className="hover:text-teal-300 transition-colors">Apart</Link>
        </div>
      </footer>
    </div>
  );
}

const otelFeatures = [
  {
    icon: "🏨",
    title: "7/24 Otele Giriş Desteği",
    desc: "Gece geç saatte gelen misafirleriniz için check-in talimatları, oda bilgileri ve yönlendirme — resepsiyonistiniz hiç uyumaz.",
  },
  {
    icon: "📋",
    title: "Oda Taleplerini Otomatik Yönet",
    desc: "Erken check-in, geç check-out, ek yastık, oda temizliği gibi talepleri alır, takip eder ve ilgili departmana iletir.",
  },
  {
    icon: "💰",
    title: "Dinamik Fiyat Teklifi",
    desc: "Müsaitlik durumuna ve sezona göre anlık fiyat teklifi verir, ek hizmetleri (kahvaltı, spa, transfer) önererek geliri artırır.",
  },
  {
    icon: "🔔",
    title: "Akıllı Yönlendirme & Öncelik",
    desc: "Acil talepleri size iletir, basit soruları kendi yanıtlar. Öncelik sırasına göre resepsiyon ekibinizi yormaz.",
  },
  {
    icon: "📊",
    title: "Doluluk & Gelir Raporları",
    desc: "Günlük doluluk oranı, ortalama gece fiyatı, gelir tahminleri ve misafir memnuniyet skorları tek panele.",
  },
  {
    icon: "🌐",
    title: "Çoklu Dil Desteği",
    desc: "Yabancı misafirlerinizle kendi dillerinde iletişim kurar. İngilizce, Almanca, Rusça ve daha fazlası.",
  },
];

const pricingPlans = [
  {
    name: "Mini",
    price: "₺0",
    features: ["1 oda tipi", "7/24 WhatsApp desteği", "Temel rezervasyon yönetimi", "E-posta bildirimleri"],
    cta: "Ücretsiz Başla",
    popular: false,
  },
  {
    name: "Otel",
    price: "₺499",
    features: ["10 oda tipine kadar", "Akıllı check-in/check-out", "Çoklu dil desteği", "WhatsApp + Telegram bildirim", "Gelir raporları"],
    cta: "14 Gün Ücretsiz Dene",
    popular: true,
  },
  {
    name: "Plus",
    price: "₺999",
    features: ["Sınırsız oda tipi", "Personel yönlendirme", "API entegrasyonu", "Özel markalı WhatsApp", "VIP destek hattı"],
    cta: "İletişime Geç",
    popular: false,
  },
];
