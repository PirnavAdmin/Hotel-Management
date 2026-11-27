import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop-large", width: 1920, height: 1080 },
  { name: "desktop-standard", width: 1366, height: 768 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "mobile-standard", width: 390, height: 844 },
  { name: "mobile-small", width: 360, height: 800 },
];

const SUPER_ADMIN_ROUTES = [
  { path: "/super-admin/dashboard", heading: "Platform Dashboard" },
  { path: "/super-admin/tenants", heading: "Tenant Management" },
  { path: "/super-admin/registrations", heading: "Restaurant Registration Approvals" },
  { path: "/super-admin/users", heading: "Admin & User Management" },
  { path: "/super-admin/branches", heading: "Branch Management" },
  { path: "/super-admin/roles", heading: "Roles & Permissions" },
  { path: "/super-admin/subscriptions", heading: "Subscription Management" },
  { path: "/super-admin/billing", heading: "SaaS Billing Management" },
  { path: "/super-admin/audit-logs", heading: "Platform Audit Logs" },
  { path: "/super-admin/support", heading: "Support Management" },
  { path: "/super-admin/settings", heading: "Platform Settings" },
];

test.describe("Phase 3.14 – Restaurant SaaS & POS Frontend Browser QA", () => {
  test("Public SaaS landing, showcase tabs, pricing, and navigation render without runtime errors", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Run Dine-In, Kitchen KOT");
    await expect(page.getByRole("heading", { name: /Engineered For Real Hospitality Operations/i })).toBeVisible();

    // Interactive Product Showcase tab switching
    const kotTab = page.getByRole("tab", { name: "Kitchen KOT Display" });
    await kotTab.click();
    await expect(kotTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toContainText("Zero-Paper Kitchen Coordination");

    await page.screenshot({ path: "e2e/screenshots/landing-desktop.png", fullPage: false });

    // Navigate to Pricing & Staff Login
    await page.getByRole("button", { name: "Pricing" }).first().click();
    await expect(page).toHaveURL(/\/pricing$/);
    await expect(page.getByRole("heading", { name: /Plans That Grow With Your Dining Rooms/i })).toBeVisible();

    await page.getByRole("button", { name: "Staff Login" }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("input:visible").first()).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("Restaurant Registration & Demo Request validation prevents empty/invalid submission", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/register-restaurant");
    await page.getByRole("button", { name: /Submit Restaurant Registration/i }).click();

    await expect(page.getByText("Organization name must be at least 2 characters.")).toBeVisible();
    await expect(page.getByText("Work email is required.")).toBeVisible();
    await expect(page.getByText("Phone number is required.")).toBeVisible();
    await expect(page.getByText("Pending Platform Approval")).toHaveCount(0);

    // Invalid Indian mobile & GSTIN check
    await page.getByLabel(/Indian Mobile Number/i).fill("1234567890");
    await page.getByLabel(/GSTIN/i).fill("BADGSTIN");
    await page.getByRole("button", { name: /Submit Restaurant Registration/i }).click();
    await expect(page.getByText(/valid 10-digit Indian mobile number/i)).toBeVisible();
    await expect(page.getByText(/valid 15-character Indian GSTIN/i)).toBeVisible();

    // Demo request validation
    await page.goto("/demo");
    await page.getByRole("form", { name: "Book a demo form" }).getByRole("button", { name: /Request Live Demo/i }).click();
    await expect(page.getByText("Your name is required.")).toBeVisible();
    await expect(page.getByText("Restaurant or organization name is required.")).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("Responsive layout has zero horizontal overflow across all 6 viewports & mobile drawers work", async ({ page }) => {
    test.setTimeout(90000);
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of ["/", "/register-restaurant", "/super-admin/dashboard"]) {
        await page.goto(route);
        await page.waitForLoadState("domcontentloaded");
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(overflow, `Horizontal overflow on ${route} at ${vp.name} (${vp.width}x${vp.height})`).toBe(false);
      }
    }

    // Mobile drawer interaction on Public SaaS (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const navToggle = page.getByRole("button", { name: "Open navigation menu" });
    await navToggle.click();
    await expect(page.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute("aria-expanded", "true");

    // Mobile sidebar drawer + Escape key on Super Admin (390x844)
    await page.goto("/super-admin/dashboard");
    const saToggle = page.getByRole("button", { name: "Open sidebar" });
    await saToggle.click();
    await expect(page.getByRole("button", { name: "Close sidebar" })).toHaveAttribute("aria-expanded", "true");
    await page.screenshot({ path: "e2e/screenshots/super-admin-mobile.png", fullPage: false });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open sidebar" })).toHaveAttribute("aria-expanded", "false");

    expect(pageErrors).toEqual([]);
  });

  test("Super Admin 11 modules render, support Escape-key modal dismissal, and preserve Integration Pending", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1366, height: 768 });

    for (const mod of SUPER_ADMIN_ROUTES) {
      await page.goto(mod.path);
      await expect(page.getByRole("heading", { level: 1, name: mod.heading })).toBeVisible();
      await expect(page.getByText(/Backend PlatformSuperAdmin Claim Required/i)).toBeVisible();
    }

    // Modal Escape dismissal & focus restoration on Tenants
    await page.goto("/super-admin/tenants");
    const wizardBtn = page.getByRole("button", { name: "+ Create Tenant Wizard" });
    await wizardBtn.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(wizardBtn).toBeFocused();

    await page.screenshot({ path: "e2e/screenshots/super-admin-tenants.png", fullPage: false });

    // Dashboard analytics cards, refresh, and 7-viewport responsive overflow check
    await page.goto("/super-admin/dashboard");
    await expect(page.getByRole("region", { name: /Monthly recurring revenue and tenant growth analytics/i })).toBeVisible();
    await expect(page.getByRole("region", { name: /Approval pipeline visualization/i })).toBeVisible();
    await expect(page.getByRole("region", { name: /Recent platform activities/i })).toBeVisible();
    await page.getByRole("button", { name: /Refresh/i }).click();

    for (const vp of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 360, height: 800 },
    ]) {
      await page.setViewportSize(vp);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `Super Admin overflow at ${vp.width}x${vp.height}`).toBe(false);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: "e2e/screenshots/super-admin-dashboard-desktop.png", fullPage: false });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.screenshot({ path: "e2e/screenshots/super-admin-dashboard-mobile.png", fullPage: false });

    expect(pageErrors).toEqual([]);
  });

  test("Existing POS, KOT, Admin auth gates and QR Self-Service routes render cleanly", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1366, height: 768 });

    for (const protectedRoute of ["/pos", "/kot", "/admin"]) {
      await page.goto(protectedRoute);
      await expect(page.locator("input:visible").first()).toBeVisible();
    }

    await page.goto("/menu");
    await expect(page.locator("body")).not.toBeEmpty();

    await page.goto("/r/indiranagar/menu");
    await expect(page.locator("body")).not.toBeEmpty();

    expect(pageErrors).toEqual([]);
  });
});
