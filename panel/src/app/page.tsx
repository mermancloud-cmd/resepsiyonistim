"use client";

import Link from "next/link";
import { useState } from "react";
import "./landing.module.css";

export default function LandingPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const faqs = [
    { q: "Misafirler botla konuştuğunu anlar mı?", a: "Hayır. Yapay zeka doğal, kısa ve empatik bir şekilde yazışır. Misafirler gerçek bir resepsiyonistle konuştuğunu düşünür. Sistem emoji, ünlem yığını ve tekrar gibi yapay zeka belirtilerini engeller." },
    { q: "Mevcut WhatsApp numaramı kullanabilir miyim?", a: "Evet. Mevcut WhatsApp numaranızı sisteme bağlarsınız. Yeni numara almanıza gerek yok. Evolution API üzerinden tek tıkla entegrasyon sağlanır." },
    { q: "Yabancı misafirler farklı dilde yazarsa ne olur?", a: "Sistem otomatik olarak dil tespiti yapar (Türkçe, İngilizce, Arapça) ve misafirin dilinde yanıt verir. Ek bir kurulum gerekmez." },
    { q: "AI cevap veremezse ne olur?", a: "Yapay zeka kendi başına çözemediği bir durumda konuşmayı size devreder. Telegram'a anında bildirim gelir, siz devreye girersiniz. Misafir bekletilmez." },
    { q: "Kurulum ne kadar sürer?", a: "Yaklaşık 10 dakika. WhatsApp numarasını bağlayın, 14 adımlık kurulum sihirbazında tesis bilgilerini girin, hazır. Teknik bilgi gerekmez." },
    { q: "Rezervasyon kilidi nasıl çalışır?", a: "Bir misafir tarih için rezervasyon başlattığında, kapora ödenene kadar o tarih diğer misafirlere kilitlenir. Çift rezervasyon engellenir. Kapora ödenmezse süre dolumunda rezervasyon otomatik iptal edilir." },
  ];

  return (
    <div className="landing-page">
      {/* NAV */}
      <nav>
        <div className="container nav-inner">
          <Link href="/" className="nav-logo">Resepsiyonist<span>im</span></Link>
          <div className={`nav-links${navOpen ? " show" : ""}`}>
            <a href="#features">Özellikler</a>
            <a href="#how">Nasıl Çalışır</a>
            <a href="#audience">Kimler İçin</a>
            <a href="#pricing">Fiyatlandırma</a>
            <a href="#faq">SSS</a>
            <Link href="/login" className="btn btn-primary">Giriş Yap</Link>
          </div>
          <button className="nav-mobile-toggle" onClick={() => setNavOpen(!navOpen)}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-content">
            <h1>Bungalovunuzun <span className="accent">7/24 dijital</span> resepsiyonisti</h1>
            <p>WhatsApp üzerinden misafirlerinizi karşılar, sorularını yanıtlar, rezervasyon alır. Siz uyurken bile çalışır. Misafirler bir botla değil, gerçek bir resepsiyonistle konuştuğunu düşünür.</p>
            <div className="hero-cta">
              <Link href="/login" className="btn btn-primary btn-lg">Ücretsiz Dene</Link>
              <a href="#how" className="btn btn-secondary btn-lg">Nasıl Çalışır?</a>
            </div>
            <div className="hero-badges">
              <div className="hero-badge"><span className="check">✓</span> 7/24 ulaşılabilir</div>
              <div className="hero-badge"><span className="check">✓</span> 3 dil desteği</div>
              <div className="hero-badge"><span className="check">✓</span> Kurulum 10 dakika</div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-phone">
              <div className="hero-phone-header">
                <div className="hero-phone-avatar">R</div>
                <div className="hero-phone-info">
                  <h4>Resepsiyonist</h4>
                  <p>çevrimiçi</p>
                </div>
              </div>
              <div className="hero-chat">
                <div className="chat-bubble guest">Merhaba, 12-14 Temmuz için müsaitlik var mı?</div>
                <div className="chat-bubble ai">Merhaba, hemen kontrol ediyorum. 12-14 Temmuz için 2 bungalovumuz müsait. Gecelik 2.500₺, toplam 5.000₺. Rezervasyon yapmak ister misiniz?</div>
                <div className="chat-bubble guest">Fiyat biraz yüksek, değerlendiriyorum</div>
                <div className="chat-bubble ai">Anlıyorum. 10-12 Temmuz'da da müsaitiz, o dönem 2.200₺'den günlük. Hangi tarihler daha uygun olur?</div>
                <div className="chat-time">14:32</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-bar">
        <div className="container stats-inner">
          <div className="stat-item"><h3>%85</h3><p>Mesaja otomatik yanıt</p></div>
          <div className="stat-item"><h3>7/24</h3><p>Kesintisiz erişim</p></div>
          <div className="stat-item"><h3>3</h3><p>Dilde doğal konuşma</p></div>
          <div className="stat-item"><h3>&lt;5dk</h3><p>Kurulum süresi</p></div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features">
        <div className="container">
          <div className="center">
            <span className="section-label">Özellikler</span>
            <h2 className="section-title">Tek WhatsApp numarası, tüm resepsiyon işleri</h2>
            <p className="section-subtitle">Misafir karşılamadan rezervasyon tamamlamaya, ödeme takibinden raporlamaya kadar her şey.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon" style={{background:"rgba(198,107,71,0.12)"}}>💬</div>
              <h3>İnsan gibi konuşma</h3>
              <p>Yapay zeka misafirle doğal şekilde yazışır. Kısa mesajlar, tek soru tek cevap, empati. Misafir botla konuştuğunu anlamaz.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{background:"rgba(58,90,64,0.12)"}}>📅</div>
              <h3>Otomatik rezervasyon</h3>
              <p>Tarih sorgulama, müsaitlik kontrolü, fiyat hesaplama, rezervasyon oluşturma — hepsi otomatik. Siz sadece onaylarsınız.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{background:"rgba(217,165,91,0.15)"}}>🌐</div>
              <h3>Çok dilli destek</h3>
              <p>Türkçe, İngilizce ve Arapça dillerinde doğal konuşma. Misafir hangi dilden yazarsa yazsın, sistem otomatik adapte olur.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{background:"rgba(58,90,64,0.12)"}}>🔔</div>
              <h3>İnsana devir</h3>
              <p>Yapay zeka kendi başına çözemeyeceği durumda konuşmayı size devreder. Telegram bildirimi anında gelir, siz devreye girersiniz.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{background:"rgba(198,107,71,0.12)"}}>💳</div>
              <h3>Kapora ve ödeme takibi</h3>
              <p>Misafirden kapora alımı, ödeme takibi, İyzico entegrasyonu. Rezervasyon kilidi ile çift rezervasyon engellenir.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{background:"rgba(217,165,91,0.15)"}}>📊</div>
              <h3>Yönetim paneli</h3>
              <p>Rezervasyonları, mesajları, gelir metriklerini tek panelden yönetin. Performans ve memnuniyet ölçülebilir.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="section how" id="how">
        <div className="container">
          <div className="center">
            <span className="section-label">Nasıl Çalışır</span>
            <h2 className="section-title">3 adımda devreye alın</h2>
            <p className="section-subtitle">Karmaşık kurulum yok. WhatsApp numaranızı bağlayın, tesis bilgilerinizi girin, hazır.</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>WhatsApp'ı bağlayın</h3>
              <p>Mevcut WhatsApp numaranızı sisteme tanıtın. Yeni numara almaya gerek yok. Tek tıkla entegrasyon.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Tesis bilgilerini girin</h3>
              <p>14 adımlık kurulum sihirbazında bungalov tipi, fiyat, müsaitlik, iptal politikası, ödeme bilgilerini girin.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Misafirleri karşılayın</h3>
              <p>Yapay zeka devreye girer. Misafirler WhatsApp'tan yazdığında otomatik yanıt alır, rezervasyon yapılır.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SHOWCASE: MULTI-LANGUAGE */}
      <section className="section">
        <div className="container showcase-inner">
          <div className="hero-visual">
            <div className="hero-phone">
              <div className="hero-phone-header">
                <div className="hero-phone-avatar">R</div>
                <div className="hero-phone-info">
                  <h4>Resepsiyonist</h4>
                  <p>çevrimiçi</p>
                </div>
              </div>
              <div className="hero-chat">
                <div className="chat-bubble guest">Hello, do you have availability this weekend?</div>
                <div className="chat-bubble ai" style={{fontSize:"0.82rem"}}>Hello! Let me check. Yes, we have 2 bungalows available from 2,500₺/night. Would you like to reserve?</div>
                <div className="chat-bubble guest" style={{fontSize:"0.82rem"}}>هل لديكم توفر هذا الأسبوع؟</div>
                <div className="chat-bubble ai" style={{fontSize:"0.78rem"}}>مرحبا! نعم، لدينا توفر. السعر يبدأ من 2500 ليرة في الليلة. هل ترغب في الحجز؟</div>
              </div>
            </div>
          </div>
          <div className="showcase-content">
            <span className="section-label">Çok Dilli Konuşma</span>
            <h2>Misafiriniz hangi dilden yazarsa yazsın</h2>
            <p>Yabancı misafirler farklı dillerden yazıyor? Sorun değil. Sistem otomatik dil tespiti yapar ve misafirin dilinde doğal şekilde yanıt verir.</p>
            <div className="showcase-list">
              <div className="showcase-item">
                <div className="showcase-item-icon">✓</div>
                <div><h4>Türkçe</h4><p>Anadil seviyesinde doğal Türkçe sohbet</p></div>
              </div>
              <div className="showcase-item">
                <div className="showcase-item-icon">✓</div>
                <div><h4>İngilizce</h4><p>Uluslararası misafirler için akıcı İngilizce</p></div>
              </div>
              <div className="showcase-item">
                <div className="showcase-item-icon">✓</div>
                <div><h4>Arapça</h4><p>Arap misafirler için doğal Arapça</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AUDIENCE */}
      <section className="section" id="audience">
        <div className="container">
          <div className="center">
            <span className="section-label">Kimler İçin</span>
            <h2 className="section-title">Küçük konaklama işletmeleri için tasarlandı</h2>
            <p className="section-subtitle">Büyük otellerin bütçesine ihtiyaç yok. Küçük tesisler için pratik ve uygun maliyetli.</p>
          </div>
          <div className="audience-grid">
            <div className="audience-card">
              <div className="emoji">🏠</div>
              <h3>Bungalov</h3>
              <p>Sapanca, Abant, Fethiye... Bungalov tesisleri için optimize edilmiş</p>
            </div>
            <div className="audience-card">
              <div className="emoji">🌳</div>
              <h3>Tiny House</h3>
              <p>Tiny house işletmecileri için uygun fiyatlı dijital resepsiyon</p>
            </div>
            <div className="audience-card">
              <div className="emoji">🏖️</div>
              <h3>Villa & Butik</h3>
              <p>Kiralık villa ve butik konaklama için profesyonel karşılama</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section pricing" id="pricing">
        <div className="container">
          <div className="center">
            <span className="section-label">Fiyatlandırma</span>
            <h2 className="section-title">İşletmenize uygun plan</h2>
            <p className="section-subtitle">Gizli ücret yok. İstediğiniz an başlayın, istediğiniz an bırakın.</p>
          </div>
          <div className="pricing-grid">
            <div className="plan-card">
              <div className="plan-name">Başlangıç</div>
              <div className="plan-price">1.499₺ <span>/ay</span></div>
              <div className="plan-desc">Tek tesisi olan küçük işletmeler için</div>
              <ul className="plan-features">
                <li><span className="dot">✓</span> 1 tesis, 5 birim</li>
                <li><span className="dot">✓</span> WhatsApp entegrasyonu</li>
                <li><span className="dot">✓</span> Türkçe dil desteği</li>
                <li><span className="dot">✓</span> Rezervasyon yönetimi</li>
                <li><span className="dot">✓</span> Yönetim paneli</li>
                <li className="off"><span className="dot">✓</span> Çok dilli destek</li>
                <li className="off"><span className="dot">✓</span> İyzico ödeme</li>
              </ul>
              <Link href="/login" className="btn btn-secondary">Başla</Link>
            </div>
            <div className="plan-card featured">
              <div className="plan-badge">En Popüler</div>
              <div className="plan-name">Profesyonel</div>
              <div className="plan-price">2.999₺ <span>/ay</span></div>
              <div className="plan-desc">Birden fazla tesisi olan işletmeler için</div>
              <ul className="plan-features">
                <li><span className="dot">✓</span> 3 tesis, 20 birim</li>
                <li><span className="dot">✓</span> WhatsApp entegrasyonu</li>
                <li><span className="dot">✓</span> 3 dil desteği (TR/EN/AR)</li>
                <li><span className="dot">✓</span> Rezervasyon + kapora</li>
                <li><span className="dot">✓</span> İyzico ödeme entegrasyonu</li>
                <li><span className="dot">✓</span> Yönetim paneli + analitik</li>
                <li><span className="dot">✓</span> Telegram bildirimleri</li>
              </ul>
              <Link href="/login" className="btn btn-primary">Başla</Link>
            </div>
            <div className="plan-card">
              <div className="plan-name">Kurumsal</div>
              <div className="plan-price">Özel</div>
              <div className="plan-desc">Büyük portföyler ve zincir işletmeler için</div>
              <ul className="plan-features">
                <li><span className="dot">✓</span> Sınırsız tesis</li>
                <li><span className="dot">✓</span> Tüm Profesyonel özellikler</li>
                <li><span className="dot">✓</span> API erişimi</li>
                <li><span className="dot">✓</span> Özel entegrasyonlar</li>
                <li><span className="dot">✓</span> Öncelikli destek</li>
                <li><span className="dot">✓</span> Özel AI kişiselleştirme</li>
                <li><span className="dot">✓</span> SLA garantisi</li>
              </ul>
              <a href="mailto:info@resepsiyonistim.com" className="btn btn-secondary">İletişime Geç</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq">
        <div className="container">
          <div className="center">
            <span className="section-label">SSS</span>
            <h2 className="section-title">Sıkça sorulan sorular</h2>
          </div>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <div key={i} className={`faq-item${faqOpen === i ? " open" : ""}`}>
                <div className="faq-q" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  {f.q}
                  <span className="arrow">+</span>
                </div>
                <div className="faq-a">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-final" id="contact">
        <div className="container">
          <h2>Misafirlerinizi karşılarken siz işinizle ilgilenin</h2>
          <p>10 dakikada kurulum, 7/24 kesintisiz resepsiyon. Ücretsiz deneyin, memnun kalmazsanız para yok.</p>
          <Link href="/login" className="btn btn-amber btn-lg">Ücretsiz Başla</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-inner">
            <div>
              <div className="footer-logo">Resepsiyonistim</div>
              <p className="footer-desc">Bungalov, tiny house ve villa işletmeleri için 7/24 WhatsApp tabanlı yapay zeka resepsiyonisti. Küçük konaklama işletmeleri için tasarlandı.</p>
            </div>
            <div className="footer-col">
              <h4>Ürün</h4>
              <ul>
                <li><a href="#features">Özellikler</a></li>
                <li><a href="#how">Nasıl Çalışır</a></li>
                <li><a href="#pricing">Fiyatlandırma</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Şirket</h4>
              <ul>
                <li><Link href="/login">Giriş Yap</Link></li>
                <li><a href="#contact">İletişim</a></li>
                <li><a href="#faq">SSS</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Yasal</h4>
              <ul>
                <li><a href="#">Gizlilik</a></li>
                <li><a href="#">Kullanım Koşulları</a></li>
                <li><a href="#">KVKK</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Resepsiyonistim. Tüm hakları saklıdır.</span>
            <span>resepsiyonistim.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}