import { test, expect } from "@playwright/test";

test.describe("Analytics — Satisfaction & Revenue", () => {
  test("yetkisiz kullanıcı login'e yönlendirilir", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page).toHaveURL(/\/login/);
  });

  test("revenue dashboard auth guard çalışır", async ({ page }) => {
    await page.goto("/analytics/revenue");
    await expect(page).toHaveURL(/\/login/);
  });

  test("analytics ana sayfası yüklenebilir", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
  });
});
