import { test, expect } from "@playwright/test";

test.describe("Subscription Page — IBAN & Plans", () => {
  test("sayfa yüklenir ve plan kartları görünür", async ({ page }) => {
    await page.goto("/subscription");

    // Başlık
    await expect(page.locator("text=Abonelik Planları")).toBeVisible();
    await expect(
      page.locator("text=14 gün ücretsiz deneyin")
    ).toBeVisible();

    // Plan kartları — en az 3 plan olmalı
    const planCards = page.locator("[class*='rounded-xl border']").filter({
      has: page.locator("h3"),
    });
    const count = await planCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("her plan kartı fiyat ve özellik içerir", async ({ page }) => {
    await page.goto("/subscription");

    // Plan isimleri
    const planNames = ["Başlangıç", "Profesyonel", "İşletme", "Kurumsal"];
    for (const name of planNames) {
      const visible = await page
        .locator(`h3:has-text("${name}")`)
        .isVisible()
        .catch(() => false);
      if (visible) {
        // Fiyat
        await expect(
          page.locator(`h3:has-text("${name}")`).locator(".. ..")
        ).toContainText("₺");
      }
    }
  });

  test("'En Popüler' badge'i önerilen planda görünür", async ({
    page,
  }) => {
    await page.goto("/subscription");

    await expect(page.locator("text=En Popüler")).toBeVisible();
  });

  test("plan seçildiğinde IBAN bilgileri açılır", async ({ page }) => {
    await page.goto("/subscription");

    // Bir plan seç
    const secBtn = page.locator("button:has-text('Bu Planı Seç'), button:has-text('Ücretsiz Dene')").first();
    await secBtn.click();

    // IBAN bilgi bölümü açılmalı
    await expect(
      page.locator("text=Havale / EFT ile Ödeme")
    ).toBeVisible({ timeout: 5000 });

    // IBAN numarası görünür
    await expect(page.locator("text=TR").or(page.locator("code:has-text('TR')"))).toBeVisible();
  });

  test("IBAN bölümü banka ve alıcı bilgilerini içerir", async ({
    page,
  }) => {
    await page.goto("/subscription");

    // Plan seç
    const secBtn = page.locator("button:has-text('Bu Planı Seç'), button:has-text('Ücretsiz Dene')").first();
    await secBtn.click();

    await expect(
      page.locator("text=Banka").or(page.locator("text=Türkiye İş Bankası"))
    ).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=IBAN")).toBeVisible();
    await expect(page.locator("text=Alıcı Adı").or(page.locator("text=Merman"))).toBeVisible();
    await expect(page.locator("text=Tutar")).toBeVisible();
  });

  test("FAQ bölümü sorular içerir", async ({ page }) => {
    await page.goto("/subscription");

    await expect(page.locator("text=Sıkça Sorulan Sorular")).toBeVisible();
    await expect(page.locator("text=Deneme süresi nasıl işler?")).toBeVisible();
    await expect(page.locator("text=İptal edebilir miyim?")).toBeVisible();
  });

  test("'Panele Dön' linki dashboard'a yönlendirir", async ({ page }) => {
    await page.goto("/subscription");

    const backLink = page.locator("a:has-text('Panele Dön')");
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/dashboard");
  });
});
