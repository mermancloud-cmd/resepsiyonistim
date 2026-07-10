"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import TrustBadges from "./trust-badges";

const TIERS = [
  {
    name: "Başlangıç",
    price: "Ücretsiz",
    period: "14 gün",
    desc: "Resepsiyonistini dene, kararını sonra ver.",
    features: [
      "1 tesis / işletme",
      "WhatsApp entegrasyonu",
      "Temel AI resepsiyonist",
      "Gelen kutusu yönetimi",
      "E-posta desteği",
    ],
    cta: "Ücretsiz Dene",
    href: "/signup",
    popular: false,
  },
  {
    name: "Profesyonel",
    price: "₺999",
    period: "/ay",
    desc: "Büyüyen işletmeler için tam paket.",
    features: [
      "Sınırsız tesis",
      "WhatsApp + Telegram + FB",
      "Gelişmiş AI persona",
      "Rezervasyon otomasyonu",
      "Lead skorlama",
      "Öncelikli destek",
    ],
    cta: "Hemen Başla",
    href: "/signup",
    popular: true,
  },
  {
    name: "Kurumsal",
    price: "Özel",
    period: "",
    desc: "Benzersiz ihtiyaçların için özel çözüm.",
    features: [
      "Özel AI model eğitimi",
      "API erişimi",
      "Özel entegrasyonlar",
      "Dedike hesap yöneticisi",
      "7/24 öncelikli destek",
      "SLA garantisi",
    ],
    cta: "Bizimle İletişime Geç",
    href: "/contact",
    popular: false,
  },
];

export default function PricingSection() {
  return (
    <section className="px-6 py-20 md:py-28 bg-gradient-to-b from-[#f7f3ee]/50 via-white to-[#f7f3ee]/50 relative">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 size-96 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 size-96 rounded-full bg-teal-300/10 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a2e2a]">
            Her İşletmeye Uygun Plan
          </h2>
          <p className="text-teal-800/60 mt-3 max-w-md mx-auto text-base">
            Küçük bungalovdan büyük otel zincirine, sana uygun paket
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border bg-white/70 backdrop-blur-sm p-7 flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                tier.popular
                  ? "border-amber-300 shadow-md shadow-amber-200/30 ring-1 ring-amber-200/50"
                  : "border-teal-100/60"
              }`}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-1 text-xs font-semibold shadow-sm">
                  <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  En Popüler
                </div>
              )}

              {/* Card content */}
              <div className="space-y-6 flex flex-col flex-1">
                <div>
                  <h3 className="font-semibold text-lg text-teal-900">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-teal-700/60 mt-1">{tier.desc}</p>
                </div>

                <div>
                  <span className="text-3xl md:text-4xl font-bold text-[#1a2e2a]">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-sm text-teal-600/60 ml-1">
                      {tier.period}
                    </span>
                  )}
                </div>

                <ul className="space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-teal-700/80"
                    >
                      <Check className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.href}
                  className={`inline-flex items-center justify-center w-full px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
                    tier.popular
                      ? "bg-teal-800 text-white hover:bg-teal-900 shadow-md"
                      : "bg-teal-100/80 text-teal-800 hover:bg-teal-200/80"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Trust bar after pricing */}
        <div className="mt-10 pt-8 border-t border-teal-100/40">
          <TrustBadges layout="row" className="justify-center" />
        </div>
      </div>
    </section>
  );
}
