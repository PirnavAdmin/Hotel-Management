import { test, expect } from "@playwright/test";

test.describe("Phase 3.26 – PIRNAV Restaurant Auth & Registration UX", () => {
  test("Staff Login page shows minimal PIRNAV header, Contact Support, and no marketing navbar links", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/login");

    const header = page.locator("header.saas-auth-header");
    await expect(header).toBeVisible();
    await expect(header).toContainText("PIRNAV");
    await expect(header).toContainText("PIRNAV Software Solutions");
    await expect(header.getByRole("link", { name: "Contact Support" })).toHaveAttribute(
      "href",
      /mailto:contact@pirnav\.com/
    );

    // Marketing links must NOT appear on /login
    for (const marketingLink of ["Features", "Pricing", "Book Demo", "About", "Contact", "Register Restaurant"]) {
      await expect(page.getByRole("button", { name: marketingLink, exact: true })).toHaveCount(0);
    }

    // Core auth inputs & Forgot Password remain available
    await expect(page.locator('input[type="text"]:visible, input[type="email"]:visible').first()).toBeVisible();
    await expect(page.locator('input[type="password"]:visible').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /forgot password/i })).toBeVisible();
  });

  test("Restaurant Registration page uses minimal PIRNAV layout and stays accessible from Landing", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/");
    await page.locator(".saas-nav-actions").getByRole("button", { name: "Register Restaurant" }).click();
    await expect(page).toHaveURL(/\/register-restaurant$/);

    const header = page.locator("header.saas-auth-header");
    await expect(header).toBeVisible();
    await expect(header).toContainText("PIRNAV");
    await expect(page.locator("header.saas-navbar")).toHaveCount(0);
    await expect(header.getByRole("button", { name: "Staff Login" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Contact Support" })).toHaveAttribute(
      "href",
      /mailto:contact@pirnav\.com/
    );
  });

  test("Login and Registration pages have zero horizontal overflow across Desktop, Tablet, and Mobile", async ({ page }) => {
    for (const vp of [
      { width: 1366, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(vp);
      for (const route of ["/login", "/register-restaurant"]) {
        await page.goto(route);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth
        );
        expect(overflow, `Overflow on ${route} at ${vp.width}x${vp.height}`).toBe(false);
      }
    }
  });
});
