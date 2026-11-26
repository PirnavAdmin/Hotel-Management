# Restaurant SaaS + POS — Frontend Feature Completeness Matrix (Phase 3.20)

**Scope:** `Frontend/` only (static source audit against `Frontend/src/` as of Phase 3.20).  
**Important Note on Live Status:** No authenticated live staging/production backend credentials were available during Phases 3.18–3.20. Therefore, no authenticated API-backed module is claimed as live-verified; API-wired modules are classified honestly as `API CALL PRESENT – LIVE VERIFICATION PENDING` or `INTEGRATION PENDING`.

## Classification Legend

| Status | Meaning |
| --- | --- |
| `IMPLEMENTED IN FRONTEND` | Complete frontend UI, validation, state, and routing implemented; does not require missing APIs to render/operate locally. |
| `API CALL PRESENT – LIVE VERIFICATION PENDING` | Frontend UI, state, error handling, and `apiClient` endpoint calls are implemented; requires live authenticated backend verification. |
| `HYBRID (API + LOCALSTORAGE FALLBACK)` | Calls backend APIs when available, with `localStorage` caching/fallback logic present in frontend code. |
| `INTEGRATION PENDING` | Frontend UI and API contract wrappers exist, explicitly surfacing `Integration Pending` / `BLOCKED` notices until backend endpoints are live. |
| `UI ONLY / LOCAL STATE` | Operates purely on props/local React state or `localStorage` without dedicated direct API calls in the module itself. |
| `PARTIAL` | Core UI exists, but some actions, states, or sub-workflows are incomplete or inconsistent across views. |

---

## 1. Public SaaS Marketing & Onboarding

| Feature / Module | Route(s) | Primary File(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| Public SaaS Landing Page | `/` (unauthenticated) | `pages/public/PublicLandingPage.jsx`, `components/public/HeroSection.jsx`, `FeaturesSection.jsx`, `HowItWorksSection.jsx`, `ProductShowcase.jsx`, `PricingSection.jsx`, `AboutSection.jsx`, `ContactSection.jsx`, `PublicNavbar.jsx`, `PublicFooter.jsx` | `IMPLEMENTED IN FRONTEND` | Responsive marketing landing page with navigation to `/pricing`, `/demo`, `/register-restaurant`, `/login`, `/super-admin`. |
| Pricing & Plan Comparison | `/pricing` | `pages/public/PricingPage.jsx`, `components/public/PricingSection.jsx` | `IMPLEMENTED IN FRONTEND` | Displays SaaS tiers and CTAs to registration/demo. |
| Demo Request Flow | `/demo` | `pages/public/DemoRequestPage.jsx`, `components/public/DemoRequestForm.jsx`, `api/saasPublicApi.js` | `INTEGRATION PENDING` | Client-side validation + `POST /api/v1/public/demo-requests`; surfaces honest `BLOCKED` / integration-pending banner on `404/405/501/0` without faking success. |
| Restaurant / Organization Registration | `/register-restaurant` | `pages/public/RestaurantRegisterPage.jsx`, `utils/saasValidation.js`, `api/saasPublicApi.js` | `INTEGRATION PENDING` | Multi-field validation (org, restaurant, branch, owner, email, phone, password, GSTIN) + `POST /api/v1/public/restaurant-registrations`; honest `BLOCKED` handling when backend endpoint is absent. |
| Staff & Admin Login | `/login` | `pages/public/StaffLoginPage.jsx`, `common/LoginPage.jsx`, `api/authApi.js`, `utils/auth.js`, `utils/authSecurity.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Real `POST /api/v1/auth/login` + OTP/forgot/reset password; legacy offline `pirnav` credentials and mock JWT removed in Phase 3.16; duplicate-submit guarded. |

---

## 2. Super Admin Control Panel (`/super-admin/*`)

All 11 modules are lazy-loaded inside `pages/public/SuperAdminPortalPage.jsx`, wrapped in `ErrorBoundary` + `Suspense`, and share `components/superadmin/SuperAdminUI.jsx` and `api/superAdminApi.js`.

| Module | Route | Primary File | Status | Notes |
| --- | --- | --- | --- | --- |
| Platform Dashboard | `/super-admin`, `/super-admin/dashboard` | `pages/superadmin/DashboardModule.jsx` | `INTEGRATION PENDING` | Calls `GET /api/v1/super-admin/dashboard/summary`; renders loading, error/pending banner, and KPI grid. |
| Tenants Directory & Onboarding Wizard | `/super-admin/tenants` | `pages/superadmin/TenantsModule.jsx` | `INTEGRATION PENDING` | List, filter, create wizard, edit, activate/suspend confirmation via `/api/v1/super-admin/tenants*`. |
| Registrations Approval Queue | `/super-admin/registrations` | `pages/superadmin/RegistrationsModule.jsx` | `INTEGRATION PENDING` | Pending/Approved/Rejected tabs, approve & reject modals via `/api/v1/super-admin/registrations*`. |
| Platform Admins & Users | `/super-admin/users` | `pages/superadmin/UsersModule.jsx` | `INTEGRATION PENDING` | Uses `/api/v1/users` with `wrapSuperAdminResponse`; create/edit modal, role filter. |
| Branches Management | `/super-admin/branches` | `pages/superadmin/BranchesModule.jsx` | `INTEGRATION PENDING` | Branch list, filter, create/edit modal via `/api/v1/super-admin/branches*`. |
| Roles & Permission Matrix | `/super-admin/roles` | `pages/superadmin/RolesModule.jsx` | `INTEGRATION PENDING` | Reads `/api/v1/roles`, saves permission matrix via `PUT /api/v1/super-admin/roles/{roleKey}/permissions`. |
| Subscriptions & Plans | `/super-admin/subscriptions` | `pages/superadmin/SubscriptionsModule.jsx` | `INTEGRATION PENDING` | Plan list & upgrade/downgrade modal via `/api/v1/super-admin/subscriptions*`. |
| SaaS Billing & Invoices | `/super-admin/billing` | `pages/superadmin/BillingModule.jsx` | `INTEGRATION PENDING` | Billing list & invoice detail modal via `/api/v1/super-admin/billing/invoices`. |
| Platform Audit Logs | `/super-admin/audit-logs` | `pages/superadmin/AuditLogsModule.jsx` | `INTEGRATION PENDING` | Action filter & audit table via `/api/v1/audit/logs` (also `/api/v1/super-admin/audit-logs` contract). |
| Support Tickets | `/super-admin/support` | `pages/superadmin/SupportModule.jsx` | `INTEGRATION PENDING` | Priority filter, ticket detail drawer/panel, internal note submission via `/api/v1/super-admin/support-tickets*`. |
| Platform Settings | `/super-admin/settings` | `pages/superadmin/SettingsModule.jsx` | `INTEGRATION PENDING` | Platform config form via `/api/v1/super-admin/settings`. |

---

## 3. Tenant Workspace & Multi-Admin Governance

| Feature / Module | Location | Primary File(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| Tenant Workspace Switcher | `AdminHeader.jsx` | `components/tenant/WorkspaceSwitcher.jsx`, `api/tenantWorkspaceApi.js` | `INTEGRATION PENDING` | Fetches `/api/v1/tenant/workspaces` & switches context via `/api/v1/tenant/switch-workspace`; clears stale workspace/invoice cache on switch. |
| Tenant Subscription & Entitlement Card | `AdminOverview.jsx` | `admin/modules/TenantWorkspaceOverview.jsx`, `api/tenantWorkspaceApi.js` | `INTEGRATION PENDING` | Fetches `/api/v1/tenant/subscription`; displays plan, limits, and entitlement status. |
| Multi-Admin & Branch Staff Access | `AdminPortal.jsx` (`logins` tab) | `admin/modules/MultiAdminManagement.jsx`, `api/userApi.js`, `api/roleApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Create/update users and inspect roles via `/api/v1/users` and `/api/v1/roles`. |
| Frontend RBAC Permission Guard | Shared across Admin/POS/KOT | `components/tenant/PermissionGuard.jsx`, `utils/permissions.js`, `utils/authSecurity.js` | `IMPLEMENTED IN FRONTEND` | Enforces route & action-level permission checks (`canAccessRoute`, `hasPermission`), paired with backend JWT enforcement. |

---

## 4. POS Floor, Dining, Takeaway, KOT, BOT & Settlement

| Feature / Module | Route / Tab | Primary File(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| POS Dining Floor & Table Grid | `/pos`, `/staff` | `user/TableView.jsx`, `api/tableApi.js`, `api/orderApi.js` | `HYBRID (API + LOCALSTORAGE FALLBACK)` | Live table status, locking, guest counts, order summaries; maintains `gourmet_pos_tables_v2_inr` fallback/cache. |
| Table Order Entry, Cart & KOT Dispatch | `/pos` (table selected) | `user/TableDetailView.jsx`, `user/ItemDetailModal.jsx`, `user/TransferTableModal.jsx`, `kot/KOTModal.jsx`, `kot/orderRouting.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Add/update/remove items, notes, discount, service charge, table transfer, KOT routing to kitchen/bar. |
| POS Takeaway Counter | `/pos` (Takeaway) | `user/TakeawayView.jsx`, `user/TakeawayOrderFlowView.jsx`, `api/orderApi.js` | `HYBRID (API + LOCALSTORAGE FALLBACK)` | Create, send to kitchen, dispatch, cancel, view bill/receipt; uses 15s polling + `isSubmittingOrder` double-submit guard + `gourmet_pos_takeaway_orders` cache. |
| Settlement & Split Payment Modal | `/pos` / `/admin` | `user/SettlementModal.jsx`, `api/orderApi.js`, `api/billingApi.js`, `utils/invoiceFinancials.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Supports Cash/Card/UPI/Split settlement and financial rounding/tax validation. |
| Unified Receipt & Print Surface | `/pos` / `/admin` | `user/ReceiptModal.jsx`, `utils/printSurface.js`, `utils/invoiceCounter.js`, `utils/liveInvoiceData.js` | `IMPLEMENTED IN FRONTEND` | Unified bill & tax breakdown aligned with `invoiceFinancials.js` and `invoiceReconciliation.js` (Phases 3.10–3.12). |
| Kitchen Display System (KOT) | `/kot` & Admin `kot` tab | `kot/KitchenKOTView.jsx`, `api/kitchenApi.js`, `api/kotApi.js` | `HYBRID (API + LOCALSTORAGE FALLBACK)` | Ticket polling, item status transitions, mark-all-ready, sound notifications, dismissed ticket cache in `localStorage`. |
| Bar Display System (BOT) & Bar Workspace | Admin Bar Mode (`bar-*`) | `bar/BarBOTView.jsx`, `bar/BarWorkspace.jsx`, `api/barApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Dedicated bar tables, drinks menu, bar staff, bar BOT tickets, bar inventory & overview via `/api/v1/bar/*`. |
| SignalR Real-Time Updates | App-wide | `realtime/RealTimeProvider.jsx`, `realtime/realtimeService.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | `@microsoft/signalr` hub connection with JWT auth, station joining, and automatic reconnect. |

---

## 5. Restaurant Admin Portal (`/admin`)

| Module | Admin Tab ID | Primary File(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| Admin Overview Dashboard | `overview` | `admin/AdminOverview.jsx`, `admin/AdminPortal.jsx` | `PARTIAL / PROP-DRIVEN` | Receives live orders/tables/invoices from `AdminPortal.jsx` + renders `TenantWorkspaceOverview`; also reads `localStorage` keys for legacy stats. |
| Dine Menu Management | `menu` | `admin/AdminPortal.jsx`, `api/menuApi.js`, `common/MenuItemCard.jsx` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Full CRUD, categories, image upload (`/api/v1/menu-items/upload-image`), availability & special toggles. |
| Tables & Chairs Management | `tables` | `admin/AdminPortal.jsx`, `api/tableApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Floor/table CRUD, status & lock management. |
| Staff & Persons Management | `staff` | `admin/AdminPortal.jsx`, `api/staffApi.js`, `api/salaryPaymentApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Staff CRUD and salary payments via `/api/v1/staff` and `/api/v1/salary-payments`. |
| Takeaway Orders (Admin) | `takeaway` | `admin/AdminTakeaway.jsx`, `api/takeawayAdminApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Admin takeaway order list, summary, status update, cancel, menu search, cart calc, invoice view. |
| Self Service Orders (Admin) | `self_service` | `admin/AdminSelfService.jsx` | `PROP-DRIVEN / PARTIAL` | Displays & manages self-service orders passed from `AdminPortal.jsx` state; no direct `selfService` API imports in `AdminSelfService.jsx` itself. |
| Table Reservations (Admin) | `reservations` | `admin/modules/ReservationsManagement.jsx`, `api/reservationApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Reservation list, create, detail, status update, cancel/delete, table assignment. |
| Inventory & Purchases | `inventory` | `admin/AdminInventory.jsx`, `api/inventoryApi.js`, `api/supplierApi.js` | `HYBRID (API + LOCALSTORAGE FALLBACK)` | Ingredients, stock adjustment, purchases, low-stock alerts, suppliers; heavy `localStorage` caching alongside API calls. |
| Unified Invoices & Reconciliation | `invoices` | `admin/AdminInvoices.jsx`, `api/invoiceApi.js`, `utils/liveInvoiceData.js`, `utils/invoiceReconciliation.js` | `HYBRID (API + LOCALSTORAGE FALLBACK)` | Reconciles backend invoices with POS orders, financial totals, GST breakdown, and receipt preview. |
| Reports & Accounting Suite | `reports`, `daily-balances`, `coa`, `general-ledger`, `journal-entries`, `audit` | `admin/AdminReports.jsx`, `admin/accounting/*.jsx`, `admin/accounting/accountingService.js`, `api/reportApi.js`, `api/accountingApi.js`, `api/auditApi.js` | `HYBRID (API + LOCALSTORAGE FALLBACK)` | `AdminReports.jsx` (4496 lines) + 9 accounting views. Phase 3.21 updated `accountingService.js`, `ChartOfAccountsView.jsx`, `JournalEntriesView.jsx`, and `DailyBalanceRegister.jsx` so API sync failures are surfaced with `role="alert"` and single-operation `Retry Sync` instead of silent `.catch(() => {})`; live backend sync remains `LIVE VERIFICATION PENDING`. |
| Customers Management | `customers` | `admin/modules/CustomersManagement.jsx`, `api/customerApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Customer directory, CRUD, order/spend summaries. |
| Delivery Management | `delivery` | `admin/modules/DeliveryManagement.jsx`, `admin/AdminSidebar.jsx`, `api/deliveryApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Linked in `AdminSidebar.jsx` (`Delivery Orders`, gated by `orders.view` when granular claims are present) and `/api/v1/delivery-orders*`. |
| Suppliers & Purchase Orders | `suppliers` | `admin/modules/SuppliersManagement.jsx`, `admin/AdminSidebar.jsx`, `api/supplierApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Linked in `AdminSidebar.jsx` (`Suppliers & POs`, gated by `inventory.manage` when granular claims are present) and `/api/v1/suppliers*`. |
| Attendance Management | `attendance` | `admin/modules/AttendanceManagement.jsx`, `admin/AdminSidebar.jsx`, `api/attendanceApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Linked in `AdminSidebar.jsx` (`Staff Attendance`, gated by `staff.manage` when granular claims are present) and `/api/v1/employees/attendance*`. |
| Promotions Management | `promotions` | `admin/modules/PromotionsManagement.jsx`, `admin/AdminSidebar.jsx`, `api/promotionApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Linked in `AdminSidebar.jsx` (`Promotions`, gated by `settings.edit` when granular claims are present) and `/api/v1/promotions*`. |
| Roles Management | `roles` | `admin/modules/RolesManagement.jsx`, `admin/AdminSidebar.jsx`, `api/roleApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Linked in `AdminSidebar.jsx` (`Roles & RBAC`, gated by `roles.manage` when granular claims are present) and `/api/v1/roles`. |
| Login & Multi-Admin Management | `logins` | `admin/LoginManagement.jsx`, `admin/modules/MultiAdminManagement.jsx` | `IMPLEMENTED IN FRONTEND` | `logins` tab combines staff login management and `MultiAdminManagement`. |
| Restaurant Settings | `settings` | `admin/AdminSettings.jsx`, `api/settingsApi.js` | `HYBRID (API + LOCALSTORAGE FALLBACK)` | Restaurant profile, GST, theme (`/api/v1/settings/theme`), printer/POS preferences; persists `gourmet_pos_settings_v1` in `localStorage`. |

---

## 6. Customer QR Self-Service & Reservations (`/menu`, `/reserve`, `?table=`)

| Feature / Module | Route(s) | Primary File(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| QR Digital Menu & Self-Service Ordering | `/menu`, `/digital-menu`, `/r/:branchCode/menu`, `?table=`, `?qr=` | `user/SelfServiceView.jsx`, `user/SelfServiceOrderTracking.jsx`, `user/SelfServicePreviewModal.jsx`, `api/orderApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Branch/table QR resolution, menu browsing, cart, self-service order placement, UPI/Cash payment initiation & live order tracking. |
| Customer Portal & Auth Flow | `/profile`, `/my-orders`, `/my-reservations`, `/takeaway-menu` | `common/CustomerLandingPage.jsx`, `customer/CustomerAuthFlow.jsx`, `customer/CustomerProfilePage.jsx`, `customer/CustomerOrdersPage.jsx`, `api/customerAuthApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Customer OTP/password login, refresh token handling, profile, order history, takeaway checkout. |
| Public Table Reservation Flow | `/reserve` | `reservation/TableReservationFlow.jsx`, `common/SelectSeatsModal.jsx`, `common/UpiOtpVerificationModal.jsx`, `api/reservationApi.js` | `API CALL PRESENT – LIVE VERIFICATION PENDING` | Availability check, seat/table selection, OTP verification, booking creation, modification, cancellation, and payment recording. |
