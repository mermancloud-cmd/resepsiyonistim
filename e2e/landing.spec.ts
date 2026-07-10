import { test, expect } from "@playwright/test";

test.describe("Landing Page — CRO & Conversion Elements", () => {
  test("sayfa yüklenir ve temel CRO öğeleri görünür", async ({ page }) => {
    await page.goto("/");

    // Navbar — logo ve CTA butonları
    await expect(page.locator("text=Resepsiyonistim").first()).toBeVisible();
    await expect(page.locator("a[href='/login']")).toBeVisible();
    await expect(page.locator("a[href='/signup']").first()).toBeVisible();

    // Hero — başlık ve alt başlık
    await expect(
      page.locator("text=Dijital Resepsiyonist")
    ).toBeVisible();
    await expect(
      page.locator("text=İşletmenize Dijital Resepsiyonist Katılıyor")
    ).toBeVisible();
    await expect(
      page.locator("text=WhatsApp tabanlı dijital resepsiyonist")
    ).toBeVisible();

    // Badge — "İnsan Gibi Konuşan Dijital Resepsiyonist"
    await expect(
      page.locator("text=İnsan Gibi Konuşan Dijital Resepsiyonist")
    ).toBeVisible();

    // Hero CTA butonları
    const signupCta = page.locator("a[href='/signup']").first();
    await expect(signupCta).toBeVisible();
    await expect(signupCta).toContainText("Ücretsiz Dene");

    // WhatsApp demo butonu
    const waButton = page.locator("a[href*='wa.me']").first();
    await expect(waButton).toBeVisible();
    await expect(waButton).toContainText("Canlı Gör");
  });

  test("features bölümü 6 kart gösterir", async ({ page }) => {
    await page.goto("/");

    // Features başlığı
    await expect(page.locator("text=Yapabilecekleri")).toBeVisible();
    await expect(page.locator("text=7/24 çalışır")).toBeVisible();

    // 6 feature kartı olmalı
    const featureCards = page.locator(
      "section >> nth=1 >> [class*='rounded-2xl']"
    );
    // Alternatif: h3 başlıkları say
    const featureTitles = [
      "İnsan Gibi Konuşma",
      "Akıllı Rezervasyon",
      "Tesis Bilgisi",
      "Analitik Dashboard",
      "Çoklu Kanal Desteği",
      "Akıllı Yönlendirme",
    ];
    for (const title of featureTitles) {
      await expect(page.locator(`h3:has-text("${title}")`)).toBeVisible();
    }
  });

  test("testimonials bölümü görünür", async ({ page }) => {
    await page.goto("/");

    // Testimonials bölümü
    await expect(page.locator("text=Müşterilerimiz Ne Diyor?")).toBeVisible();

    // En az bir yorum kartı
    await expect(page.locator("text=★★★★★").first()).toBeVisible();
  });

  test("alt CTA bölümü 'Denemeye Hazır mısın?' gösterir", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("text=Denemeye Hazır mısın?")).toBeVisible();
    await expect(
      page.locator("text=kart bilgisi gerekmez")
    ).toBeVisible();

    // Alt CTA butonları
    const ctaButtons = page.locator("section >> nth=2 a");
    await expect(ctaButtons.first()).toBeVisible();
  });

  test("footer görünür ve telif hakkı bilgisi içerir", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=Resepsiyonistim").last()).toBeVisible();
    await expect(page.locator("text=Tüm hakları saklıdır")).toBeVisible();
  });
});
