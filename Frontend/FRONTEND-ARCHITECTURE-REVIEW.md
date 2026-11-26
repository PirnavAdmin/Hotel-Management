# Restaurant SaaS + POS — Frontend Architecture Review (Phase 3.20)

**Scope:** `Frontend/src/` structural, maintainability, security, and performance review.

---

## 1. Codebase Scale & Structural Distribution

Based on the Phase 3.20 source inventory across `Frontend/src/`:

- **Total Directory Breakdown:** `admin/` (32 files, including 10 in `admin/accounting/` and 9 in `admin/modules/`), `api/` (31 files), `bar/` (7 files), `common/` (30 files), `components/` (13 files), `customer/` (6 files), `data/` (3 files), `kot/` (4 files), `pages/` (17 files, including 11 Super Admin modules), `realtime/` (2 files), `reservation/` (3 files), `styles/` (2 files), `user/` (16 files), `utils/` (28 files), root (`App.jsx`, `App.css`, `main.jsx`, `index.css`, `design-system.css`).

### Largest Monolithic Files (Technical Debt Hotspots)

| File | Line Count | Observation |
| --- | --- | --- |
| `bar/BarWorkspace.jsx` | 9,097 lines | Houses Bar overview, drinks, tables, staff, inventory, invoices, and reports in one file. |
| `admin/AdminPortal.jsx` | 8,771 lines | Orchestrates 20+ admin tabs, shared state, inline `menu`/`tables`/`staff`/`kot` views, and modal state. |
| `App.jsx` | 6,123 lines | Top-level router, auth session hydration, POS/KOT/Admin/Public SaaS/Customer routing, and shared POS state. |
| `user/TableDetailView.jsx` | 5,220 lines | Dine-in table ordering, menu browser, cart, modifiers, KOT dispatch, and billing triggers. |
| `admin/AdminReports.jsx` | 4,496 lines | Sales, KOT, inventory, payroll reports plus accounting sub-tab orchestration. |
| `reservation/TableReservationFlow.jsx` | 4,271 lines | Public reservation wizard, seat picker, OTP, and payment steps. |
| `admin/AdminInventory.jsx` | 4,114 lines | Inventory items, adjustments, purchases, low stock, and supplier flows. |
| `common/CustomerLandingPage.jsx` | 3,804 lines | Customer portal landing, menu, takeaway, reservations, and profile wrapper. |
| `kot/KitchenKOTView.jsx` | 3,396 lines | Kitchen display tickets, timers, filters, and sound alerts. |
| `user/TableView.jsx` | 3,089 lines | POS floor plan, table cards, locks, and timers. |

**Recommendation (Future Refactor Phase):** Incrementally extract `AdminPortal.jsx` inline tabs (`menu`, `tables`, `staff`, `kot`) into `admin/modules/` and split `BarWorkspace.jsx` by tab, matching the clean modular pattern already used in `pages/superadmin/*.jsx` (80–301 lines per module).

---

## 2. Strengths Observed

1. **Dedicated API Layer (`Frontend/src/api/`):** 31 domain-scoped API modules funneling through `apiClient` (`apiConfig.js`) with consistent Bearer token attachment, `401` expiry event (`avsr-auth-expired`), and error classification.
2. **Modular Super Admin Architecture:** `SuperAdminPortalPage.jsx` lazy-loads 11 focused modules (`80`–`301` lines each) behind `ErrorBoundary`, `Suspense`, and shared `SuperAdminUI.jsx` primitives, keeping the initial bundle fast and isolated.
3. **Production Auth & Security Hardening (Phases 3.15–3.16):**
   - Zero hardcoded fallback passwords or mock JWT tokens in `auth.js` or production bundles.
   - Route-level (`isAllowedForRoute`) and action-level (`permissions.js`, `PermissionGuard.jsx`) RBAC checks.
   - `sanitizeRedirectPath` prevents open redirects; `clearAuthSessionStorage` clears session/workspace keys on logout or workspace switch.
4. **Unified Financial & Invoice Engine (Phases 3.7–3.12):**
   - Single source of truth in `invoiceFinancials.js`, `invoiceReconciliation.js`, `liveInvoiceData.js`, and `invoiceCounter.js`, eliminating GST/rounding drift between POS `SettlementModal`, `ReceiptModal`, and `AdminInvoices`.
5. **Honest Integration Boundaries:** `saasPublicApi.js` and `superAdminApi.js` never fabricate success responses; missing backend routes (`404`/`405`/`501`/`0`) surface explicit `Integration Pending` / `BLOCKED` UI states.

---

## 3. Architectural Risks & Recommended Priorities

1. **Resolved in Phase 3.21 (`GAP-03`):** Silent `.catch(() => {})` in `accountingService.js` has been replaced by observable `performAccountingApiSync` + `retryAccountingSync` with sanitized error reporting in `ChartOfAccountsView.jsx`, `JournalEntriesView.jsx`, and `DailyBalanceRegister.jsx` (live staging verification pending).
2. **Resolved in Phase 3.21 (`GAP-01`):** `delivery`, `suppliers`, `attendance`, `promotions`, and `roles` are now linked in `AdminSidebar.jsx` with granular permission filtering (`hasBackendPermissionClaims` / `hasPermission`).
3. **P2 — Dual State Source (`localStorage` + API):** Legacy POS/Inventory/Settings `localStorage` keys should gradually transition to API-authoritative state with React Query / SWR or explicit cache invalidation per tenant/branch.
4. **P2 — Monolith Bundle & Maintainability:** `AdminPortal.jsx`, `BarWorkspace.jsx`, `App.jsx`, and `TableDetailView.jsx` exceed 5,000 lines each and should be modularized in a dedicated post-staging refactor phase.
