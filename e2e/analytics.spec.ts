import { test, expect } from "@playwright/test";

test.describe("Analytics Pages", () => {
  test("analytics ana sayfası yüklenir ve hata vermez", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/analytics");

    // Sayfa içeriği yüklendi mi?
    const hasContent = await page
      .locator("h1, h2, h3, [class*='chart'], [class*='Card'], [class*='card']")
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    // Sayfa en azından boş bir hata sayfası göstermemeli
    expect(hasContent).toBe(true);

    // JavaScript hatası olmamalı
    expect(errors.length).toBe(0);
  });

  test("conversion analytics sayfası yüklenir", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/analytics/conversion");

    const hasContent = await page
      .locator("h1, h2, h3, [class*='chart'], [class*='Card']")
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    expect(hasContent).toBe(true);
    expect(errors.length).toBe(0);
  });

  test("revenue analytics sayfası yüklenir", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/analytics/revenue");

    const hasContent = await page
      .locator("h1, h2, h3, [class*='chart'], [class*='Card']")
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    expect(hasContent).toBe(true);
    expect(errors.length).toBe(0);
  });
});
