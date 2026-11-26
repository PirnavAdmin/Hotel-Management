# Restaurant SaaS + POS — Frontend Workflow Gap Analysis (Phase 3.20)

**Scope:** `Frontend/` source-code workflow, navigation, state, and integration gap analysis.

---

## 1. Confirmed Navigation & Discoverability Gaps

| ID | Severity | Area | Finding | Evidence |
| --- | --- | --- | --- | --- |
| GAP-01 | **P1 (Navigation) — RESOLVED IN PHASE 3.21** | Restaurant Admin Sidebar | Five implemented Admin modules (`delivery`, `suppliers`, `attendance`, `promotions`, `roles`) in `AdminPortal.jsx` were missing from `AdminSidebar.jsx`. **Phase 3.21 Resolution:** Added all 5 navigation items (`Delivery Orders`, `Suppliers & POs`, `Staff Attendance`, `Promotions`, `Roles & RBAC`) using exact tab IDs and permission-aware filtering via `hasBackendPermissionClaims` / `hasPermission` in `Frontend/src/admin/AdminSidebar.jsx`. Live authenticated click-through remains pending staging credentials. | `Frontend/src/admin/AdminSidebar.jsx`, `Frontend/e2e/admin-navigation.spec.js` |
| GAP-02 | **P2 (Overlap)** | Roles Management | `RolesManagement.jsx` (Restaurant Admin `roles` tab) and `pages/superadmin/RolesModule.jsx` (`/super-admin/roles`) both display platform/tenant roles, creating minor role-governance overlap if both are exposed. | `admin/modules/RolesManagement.jsx` vs `pages/superadmin/RolesModule.jsx` |

---

## 2. Hybrid `localStorage` vs Backend API Synchronization Gaps

| ID | Severity | Area | Finding | Evidence |
| --- | --- | --- | --- | --- |
| GAP-03 | **P1 (Data Consistency) — RESOLVED IN PHASE 3.21** | Accounting Service | `accountingService.js` previously fired API save/delete calls with `.catch(() => {})` and posted the wrong array index (`entries[entries.length - 1]` / `balances[balances.length - 1]`). **Phase 3.21 Resolution:** Replaced silent catches with `performAccountingApiSync` + `retryAccountingSync` in `Frontend/src/admin/accounting/accountingService.js`, preserved `localStorage` data on API failure, added sanitized error messages, and updated `ChartOfAccountsView.jsx`, `JournalEntriesView.jsx`, and `DailyBalanceRegister.jsx` to show truthful local-only vs server-synced banners with manual `Retry Sync`. Live backend sync remains `LIVE VERIFICATION PENDING`. | `Frontend/src/admin/accounting/accountingService.js`, `ChartOfAccountsView.jsx`, `JournalEntriesView.jsx`, `DailyBalanceRegister.jsx` |
| GAP-04 | **P2 (Data Consistency)** | POS Floor & Takeaway Cache | `TableView.jsx`, `TakeawayView.jsx`, and `KitchenKOTView.jsx` maintain `gourmet_pos_tables_v2_inr`, `gourmet_pos_takeaway_orders`, `gourmet_pos_past_orders_v2_inr`, and `gourmet_kot_dismissed_tickets_v1` in `localStorage` alongside API calls. Multi-terminal concurrent edits rely on SignalR/polling reconciliation and should be verified against live staging. | `TableView.jsx` L1035–1124, `TakeawayView.jsx` L209, `KitchenKOTView.jsx` L226–508 |
| GAP-05 | **P2 (Data Consistency)** | Inventory & Settings Cache | `AdminInventory.jsx` (21 `localStorage` calls) and `AdminSettings.jsx` (20 `localStorage` calls) persist local caches alongside backend endpoints. Note: `authSecurity.js` clears auth/session/workspace keys on logout/workspace switch, whereas operational POS caches should be verified in multi-tenant staging tests. | `AdminInventory.jsx`, `AdminSettings.jsx`, `utils/authSecurity.js` |

---

## 3. Prop-Driven / Partial Admin Sub-Modules

| ID | Severity | Area | Finding | Evidence |
| --- | --- | --- | --- | --- |
| GAP-06 | **P2 (Coupling)** | `AdminSelfService.jsx` & `LoginManagement.jsx` | Neither file imports API modules directly; both rely entirely on props passed down from the 8,771-line `AdminPortal.jsx` monolith, making isolated testing and error/loading state handling harder. | `AdminSelfService.jsx` (822L), `LoginManagement.jsx` (784L), `AdminPortal.jsx` (8771L) |
| GAP-07 | **P2 (Overlapping)** | `AdminOverview.jsx` | Combines prop-driven metrics from `AdminPortal.jsx`, `localStorage` reads, and `TenantWorkspaceOverview` (`apiGetTenantSubscriptionEntitlement`) instead of a single unified `/api/v1/reports/dashboard` source of truth. | `AdminOverview.jsx` (1624L) |

---

## 4. Backend-Dependent Integration Pending Workflows (Frontend Ready, Backend Required)

1. **Public SaaS Onboarding:** `POST /api/v1/public/restaurant-registrations` and `POST /api/v1/public/demo-requests` (`saasPublicApi.js`).
2. **Super Admin Control Panel:** 9 dedicated `/api/v1/super-admin/*` endpoints (`superAdminApi.js`).
3. **Tenant Workspace Switching & Entitlements:** `/api/v1/tenant/workspaces`, `/api/v1/tenant/switch-workspace`, `/api/v1/tenant/subscription` (`tenantWorkspaceApi.js`).
4. **Live Authenticated E2E:** Staff login, POS floor settlement, KOT/BOT realtime round-trip, Admin invoice PDF/receipt generation, and Customer QR checkout against live ASP.NET Core + MySQL staging.
