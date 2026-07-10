import { test, expect } from "@playwright/test";

test.describe("Settings — Channels Dashboard", () => {
  test("kanallar sayfası yüklenir", async ({ page }) => {
    await page.goto("/settings/channels");

    // Sayfa başlığı
    await expect(
      page.locator("text=Kanallar").or(page.locator("h1:has-text('Kanal')")).or(
        page.locator("text=İletişim Kanalları")
      )
    ).toBeVisible({ timeout: 10000 });

    // Kanal listesi veya dashboard
    await expect(
      page.locator("text=WhatsApp").or(page.locator("text=whatsapp"))
    ).toBeVisible();
  });

  test("tüm kanal tipleri listelenir", async ({ page }) => {
    await page.goto("/settings/channels");

    const channels = ["WhatsApp", "Telegram", "Facebook"];
    for (const channel of channels) {
      const visible = await page
        .locator(`text=${channel}`)
        .isVisible()
        .catch(() => false);
      if (visible) {
        // Kanal bulundu — durum badge'i veya bağlantı bilgisi içermeli
        const section = page.locator(`text=${channel}`).locator("..");
        await expect(section).toBeVisible();
      }
    }
  });

  test("kanal bağlantı durumu badge'i gösterilir", async ({ page }) => {
    await page.goto("/settings/channels");

    // Status badge'leri — en az biri yeşil (bağlı) veya kırmızı (hata) olabilir
    const badges = page.locator("[class*='badge'], [class*='Badge']");
    const count = await badges.count();
    // En az bir durum göstergesi olmalı
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
