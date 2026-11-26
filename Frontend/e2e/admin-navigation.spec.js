import { test, expect } from "@playwright/test";

const STAGING_ADMIN_USER = process.env.STAGING_ADMIN_USER || "";
const STAGING_ADMIN_PASS = process.env.STAGING_ADMIN_PASS || "";

const NEW_ADMIN_TABS = [
  { label: "Delivery Orders", expectedText: /Delivery/i },
  { label: "Suppliers & POs", expectedText: /Supplier/i },
  { label: "Staff Attendance", expectedText: /Attendance/i },
  { label: "Promotions", expectedText: /Promotion/i },
  { label: "Roles & RBAC", expectedText: /Roles & Permissions/i },
];

test.describe("Phase 3.21 – Admin Sidebar Navigation & Security Regression", () => {
  test("Unauthenticated users cannot view Admin sidebar navigation items", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("button", { name: "Delivery Orders" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Suppliers & POs" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Staff Attendance" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Promotions" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Roles & RBAC" })).toHaveCount(0);
  });

  test("Authorized Admin can navigate all 5 new sidebar items, existing items, and mobile drawer", async ({ page }) => {
    test.skip(!STAGING_ADMIN_USER || !STAGING_ADMIN_PASS, "Staging Admin credentials not configured");

    await page.goto("/login");
    await page.locator('input[type="text"], input[name="username"]').first().fill(STAGING_ADMIN_USER);
    await page.locator('input[type="password"]').first().fill(STAGING_ADMIN_PASS);
    await page.getByRole("button", { name: /sign in|login/i }).first().click();

    await page.waitForURL(/\/admin/, { timeout: 15000 });

    const nav = page.getByRole("navigation", { name: /Restaurant sections/i });
    await expect(nav).toBeVisible();

    for (const item of NEW_ADMIN_TABS) {
      const btn = nav.getByRole("button", { name: item.label });
      await expect(btn).toBeVisible();
      await btn.click();
      await expect(btn).toHaveAttribute("aria-current", "page");
      await expect(page.locator("main, [role='main'], .admin-portal-content").first()).toContainText(item.expectedText);
    }

    // Existing navigation still works
    const overviewBtn = nav.getByRole("button", { name: "Overview" });
    await overviewBtn.click();
    await expect(overviewBtn).toHaveAttribute("aria-current", "page");

    // Mobile drawer regression
    await page.setViewportSize({ width: 390, height: 844 });
    const menuToggle = page.getByRole("button", { name: /open navigation|menu/i }).first();
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
      await nav.getByRole("button", { name: "Delivery Orders" }).click();
      await expect(nav.getByRole("button", { name: "Delivery Orders" })).toHaveAttribute("aria-current", "page");
    }
  });
});
