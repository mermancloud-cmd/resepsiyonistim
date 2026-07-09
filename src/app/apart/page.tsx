import Link from "next/link";
import { DEMO_WHATSAPP_NUMBER, DEMO_WHATSAPP_MESSAGE } from "@/lib/app-config";

export default function ApartPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#f7f3ee] via-white to-[#f0ebe4]">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full relative z-30">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-amber-200/50">R</div>
          <span className="font-semibold text-xl" style={{ fontFamily: "var(--font-heading)", color: "#1a2e2a" }}>Resepsiyonistim</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-teal-800/70 hover:text-teal-900 transition-colors px-3 py-2">Giriş</Link>
          <Link href="/signup" className="text-sm font-semibold bg-gradient-to-r from-teal-700 to-teal-600 text-white px-5 py-2.5 rounded-xl hover:from-teal-800 hover:to-teal-700 transition-all shadow-sm">Ücretsiz Dene</Link>
        </nav>
      </header>

      {/* ─── HERO ─── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center relative overflow-hidden">
        {/* Arkaplan: apart silueti */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] h-auto opacity-[0.05] md:opacity-[0.065]" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "blur(1px)" }}>
            {/* Zemin */}
            <rect x="0" y="510" width="800" height="90" fill="#1a2e2a" />
            {/* Apart blok */}
            <rect x="150" y="220" width="500" height="290" rx="5" fill="#1a2e2a" />
            {/* Sağ blok */}
            <rect x="560" y="300" width="120" height="210" rx="3" fill="#1a2e2a" />
            {/* Sol blok */}
            <rect x="100" y="300" width="70" height="210" rx="3" fill="#1a2e2a" />
            {/* Kat bantları */}
            <rect x="150" y="300" width="500" height="3" fill="#f7f3ee" opacity="0.08" />
            <rect x="150" y="380" width="500" height="3" fill="#f7f3ee" opacity="0.08" />
            <rect x="150" y="460" width="500" height="3" fill="#f7f3ee" opacity="0.08" />
            {/* Balkonlar */}
            {[170, 260, 350, 440, 530, 620].map((x) => (
              <rect key={`blk-${x}`} x={x} y="382" width="50" height="8" rx="2" fill="#f7f3ee" opacity="0.06" />
            ))}
            {/* Giriş */}
            <rect x="350" y="445" width="100" height="65" rx="4" fill="#f7f3ee" opacity="0.1" />
            {/* Pencereler */}
            {[185, 275, 365, 455, 545].map((x) => ([240, 320, 400]).map((y) => (
              <rect key={`ap-w-${x}-${y}`} x={x} y={y} width="35" height="45" rx="2" fill="#f7f3ee" opacity="0.08" />
            )))}
            {/* Çatı teras */}
            <rect x="200" y="210" width="400" height="12" rx="2" fill="#f7f3ee" opacity="0.06" />
            {/* Şezlonglar (çatıda) */}
            <rect x="300" y="228" width="40" height="8" rx="4" fill="#f7f3ee" opacity="0.05" />
            <rect x="360" y="228" width="40" height="8" rx="4" fill="#f7f3ee" opacity="0.05" />
            <rect x="420" y="228" width="40" height="8" rx="4" fill="#f7f3ee" opacity="0.05" />
            {/* Şehir ışıkları - arka plan */}
            <rect x="60" y="440" width="15" height="5" rx="1" fill="#f7f3ee" opacity="0.03" />
            <rect x="720" y="450" width="20" height="5" rx="1" fill="#f7f3ee" opacity="0.03" />
            <rect x="740" y="430" width="12" height="5" rx="1" fill="#f7f3ee" opacity="0.03" />
            {/* Yıldızlar */}
            <circle cx="120" cy="70" r="2" fill="#1a2e2a" opacity="0.3" />
            <circle cx="300" cy="45" r="1.5" fill="#1a2e2a" opacity="0.25" />
            <circle cx="500" cy="60" r="2" fill="#1a2e2a" opacity="0.3" />
            <circle cx="650" cy="35" r="1.5" fill="#1a2e2a" opacity="0.2" />
            <circle cx="220" cy="100" r="1" fill="#1a2e2a" opacity="0.2" />
            <circle cx="680" cy="80" r="1" fill="#1a2e2a" opacity="0.2" />
          </svg>
        </div>

        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 size-80 rounded-full bg-amber-300/15 blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 size-[28rem] rounded-full bg-teal-300/15 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto space-y-9 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-sm border border-amber-200/50 px-4 py-1.5 text-xs font-medium text-amber-800 shadow-sm">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            Apart Otel &amp; Residence İşletmeleri İçin
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-[#1a2e2a] max-w-3xl mx-auto">
            Apart Otelinize
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 block mt-2">
              Dijital Resepsiyonist
            </span>
          </h1>

          <p className="text-base md:text-lg text-teal-800/70 max-w-xl mx-auto leading-relaxed">
            Misafirleriniz WhatsApp&rsquo;tan yazar, resepsiyonistiniz anında
            yanıtlar. <strong className="text-teal-900 font-semibold">Apart
            otelinizde check-in&rsquo;den check-out&rsquo;a</strong> tüm
            süreçleri otomatize eder, personel ihtiyacını azaltır.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-teal-800 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-teal-900 transition-all shadow-md text-base hover:-translate-y-0.5 hover:shadow-lg">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Ücretsiz Dene
            </Link>
            <a href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=${encodeURIComponent(DEMO_WHATSAPP_MESSAGE)}`} target="_blank" rel="noopener noreferrer" className="group relative inline-flex items-center gap-3 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white px-9 py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-300/40 hover:shadow-xl hover:shadow-emerald-300/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
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

      {/* ─── ÖZELLİKLER (Apart) ─── */}
      <section className="px-6 py-20 md:py-28 bg-gradient-to-b from-white/80 via-white to-white/80 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a2e2a]">Apart Otellere Özel Çözümler</h2>
            <p className="text-teal-800/60 mt-3 max-w-md mx-auto text-base">Residence, apart otel, studio daire — self-checkin konseptine uygun akıllı resepsiyonist</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {apartFeatures.map((f) => (
              <div key={f.title} className="group relative rounded-2xl border border-teal-100/60 bg-white/60 backdrop-blur-sm p-7 space-y-4 hover:border-amber-200/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                <div className="size-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-2xl shadow-sm border border-amber-200/40 relative z-10">{f.icon}</div>
                <h3 className="font-semibold text-lg text-teal-900 relative z-10" style={{ fontFamily: "var(--font-heading)" }}>{f.title}</h3>
                <p className="text-sm text-teal-700/70 leading-relaxed relative z-10">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FİYATLANDIRMA ─── */}
      <section className="px-6 py-16 md:py-20 bg-white relative">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a2e2a]">Basit Fiyatlandırma</h2>
            <p className="text-teal-800/60 mt-3 max-w-md mx-auto text-base">Apart oteliniz için en uygun planı seçin</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {pricingPlans.map((plan) => (
              <div key={plan.name} className={`rounded-2xl border p-7 space-y-4 transition-all duration-300 ${plan.popular ? "border-amber-300 bg-gradient-to-b from-amber-50/60 to-white shadow-lg shadow-amber-100/50 scale-[1.03] relative" : "border-teal-100/60 bg-white/80 hover:shadow-md"}`}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full">En Çok Tercih Edilen</div>}
                <h3 className="font-bold text-lg text-teal-900" style={{ fontFamily: "var(--font-heading)" }}>{plan.name}</h3>
                <p className="text-3xl font-bold text-[#1a2e2a]">{plan.price}<span className="text-sm font-normal text-teal-600 ml-1">/ay</span></p>
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
                <Link href={plan.href} className={`block text-center font-semibold px-5 py-3 rounded-xl transition-all text-sm ${plan.popular ? "bg-teal-800 text-white hover:bg-teal-900 shadow-md" : "border border-teal-200 text-teal-800 hover:bg-teal-50"}`}>{plan.cta}</Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-teal-500/60 mt-8">Tüm planlar 14 gün ücretsiz deneme içerir. Sözleşme yok, dilediğiniz zaman iptal.</p>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-6 py-20 md:py-28 bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] size-[400px] rounded-full bg-amber-400/5 blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] size-[300px] rounded-full bg-white/5 blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="apart-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" /></pattern></defs>
            <rect width="100" height="100" fill="url(#apart-grid)" />
          </svg>
        </div>
        <div className="max-w-2xl mx-auto space-y-8 relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">Apart Oteliniz İçin Dijital Resepsiyonist Zamanı</h2>
          <p className="text-teal-100/80 text-base md:text-lg max-w-lg mx-auto">Şimdilik test aşamasındayız. Ama resepsiyonistinizin nasıl konuştuğunu görmek için hemen deneyin.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-amber-500 text-amber-950 px-7 py-3.5 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 text-base hover:-translate-y-0.5">
              Ücretsiz Dene
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=${encodeURIComponent(DEMO_WHATSAPP_MESSAGE)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 bg-white/10 text-white border border-white/20 px-6 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-all hover:-translate-y-0.5">
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
          <Link href="/otel" className="hover:text-teal-300 transition-colors">Otel</Link>
          <Link href="/villa" className="hover:text-teal-300 transition-colors">Villa</Link>
        </div>
      </footer>
    </div>
  );
}

const apartFeatures = [
  {
    icon: "🏢",
    title: "Self Check-in Otomasyonu",
    desc: "Misafir varış saatinden önce kapı kodu, daire numarası, wifi bilgileri ve yol tarifini otomatik gönderir. Personelsiz giriş.",
  },
  {
    icon: "🔑",
    title: "Akıllı Daire Yönetimi",
    desc: "Her daire için ayrı takvim, fiyatlandırma ve müsaitlik. Temizlik programını takip eder ve housekeeping ekibine bildirim gönderir.",
  },
  {
    icon: "🧹",
    title: "Temizlik & Bakım Talepleri",
    desc: "Misafirler temizlik, havlu değişimi veya arıza taleplerini WhatsApp'tan iletir, sistem ilgili ekibe otomatik yönlendirir.",
  },
  {
    icon: "📊",
    title: "Doluluk & Fiyat Optimizasyonu",
    desc: "Günlük/yıllık doluluk oranları, ortalama gecelik fiyat, en çok talep edilen daire tipleri — tüm metrikler tek panelde.",
  },
  {
    icon: "💬",
    title: "7/24 Misafir Desteği",
    desc: "Gece yarısı gelen sorular, geç check-in talepleri, ek yatak istekleri — resepsiyonistiniz her an yanıtlamaya hazır.",
  },
  {
    icon: "📱",
    title: "Rehber & Bilgi Paylaşımı",
    desc: "Yakın restoranlar, marketler, toplu taşıma durakları, acil numaralar — misafirlerinize anında bölge rehberi sunar.",
  },
];

const pricingPlans = [
  { name: "Mini", price: "₺0", features: ["5 daireye kadar", "7/24 WhatsApp desteği", "Temel self check-in", "E-posta bildirimleri"], cta: "Ücretsiz Başla", popular: false, href: "/signup" },
  { name: "Apart", price: "₺249", features: ["20 daireye kadar", "Self check-in otomasyonu", "Housekeeping bildirimleri", "WhatsApp + Telegram bildirim", "Misafir rehberi"], cta: "14 Gün Ücretsiz Dene", popular: true, href: "/signup" },
  { name: "Plus", price: "₺499", features: ["Sınırsız daire", "API entegrasyonu", "Özel markalı WhatsApp", "VIP destek", "Gelişmiş raporlama"], cta: "İletişime Geç", popular: false, href: "/signup" },
];
