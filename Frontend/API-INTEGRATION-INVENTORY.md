# Restaurant SaaS + POS — Frontend API Integration Inventory (Phase 3.20)

**Scope:** All 31 files under `Frontend/src/api/` plus direct `apiClient` / `fetch` calls in `Frontend/src/admin/AdminSettings.jsx` and `Frontend/src/realtime/RealTimeProvider.jsx`.  
**Verification Note:** Every endpoint listed below is verified from frontend source code. Live backend verification against a running ASP.NET Core staging server remains **PENDING** because staging credentials were not provided in Phases 3.18–3.20.

---

## 1. Core HTTP Client & Auth Configuration (`apiConfig.js`)

- `API_BASE_URL` resolved via `getResolvedApiBase()`.
- `apiClient(endpoint, options)` attaches `Authorization: Bearer <token>` from `localStorage` (`avsr_jwt_token`), handles timeouts/network classification, and dispatches `avsr-auth-expired` on `401` (for authenticated routes).
- Explicit `skipDefaultAuth: true` supported for public SaaS/customer endpoints.

---

## 2. Public SaaS & Platform Super Admin APIs

### `saasPublicApi.js` (81 lines)
| Exported Function | Method | Endpoint | Live Status |
| --- | --- | --- | --- |
| `apiRegisterRestaurant` | `POST` | `/api/v1/public/restaurant-registrations` | `INTEGRATION PENDING` (handles 404/405/501/0 as `blocked: true`) |
| `apiSubmitDemoRequest` | `POST` | `/api/v1/public/demo-requests` | `INTEGRATION PENDING` (handles 404/405/501/0 as `blocked: true`) |

### `superAdminApi.js` (230 lines)
| Exported Function | Method | Endpoint | Live Status |
| --- | --- | --- | --- |
| `apiGetSuperAdminDashboard` | `GET` | `/api/v1/super-admin/dashboard/summary` | `INTEGRATION PENDING` |
| `apiGetTenants` | `GET` | `/api/v1/super-admin/tenants` | `INTEGRATION PENDING` |
| `apiCreateTenant` | `POST` | `/api/v1/super-admin/tenants` | `INTEGRATION PENDING` |
| `apiUpdateTenant` | `PUT` | `/api/v1/super-admin/tenants/{tenantId}` | `INTEGRATION PENDING` |
| `apiSetTenantStatus` | `PATCH` | `/api/v1/super-admin/tenants/{tenantId}/status` | `INTEGRATION PENDING` |
| `apiGetRegistrations` | `GET` | `/api/v1/super-admin/registrations` | `INTEGRATION PENDING` |
| `apiApproveRegistration` | `POST` | `/api/v1/super-admin/registrations/{id}/approve` | `INTEGRATION PENDING` |
| `apiRejectRegistration` | `POST` | `/api/v1/super-admin/registrations/{id}/reject` | `INTEGRATION PENDING` |
| `apiGetSuperAdminUsers` / `apiSaveSuperAdminUser` | `GET`/`POST`/`PUT` | Delegates to `userApi` (`/api/v1/users*`) | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `apiGetBranches` / `apiSaveBranch` | `GET`/`POST`/`PUT` | `/api/v1/super-admin/branches*` | `INTEGRATION PENDING` |
| `apiGetPlatformRoles` | `GET` | Delegates to `roleApi` (`/api/v1/roles`) | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `apiSaveRolePermissions` | `PUT` | `/api/v1/super-admin/roles/{roleKey}/permissions` | `INTEGRATION PENDING` |
| `apiGetSubscriptions` / `apiUpdateTenantSubscription` | `GET`/`PUT` | `/api/v1/super-admin/subscriptions*` | `INTEGRATION PENDING` |
| `apiGetSaasBillingInvoices` | `GET` | `/api/v1/super-admin/billing/invoices` | `INTEGRATION PENDING` |
| `apiGetPlatformAuditLogs` | `GET` | Delegates to `auditApi` (`/api/v1/audit/logs`) | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `apiGetSupportTickets` / `apiAddTicketNote` | `GET`/`POST` | `/api/v1/super-admin/support-tickets*` | `INTEGRATION PENDING` |
| `apiGetPlatformSettings` / `apiSavePlatformSettings` | `GET`/`PUT` | `/api/v1/super-admin/settings` | `INTEGRATION PENDING` |

### `tenantWorkspaceApi.js` (61 lines)
| Exported Function | Method | Endpoint | Live Status |
| --- | --- | --- | --- |
| `apiGetAuthorizedWorkspaces` | `GET` | `/api/v1/tenant/workspaces` | `INTEGRATION PENDING` |
| `apiSwitchWorkspaceContext` | `POST` | `/api/v1/tenant/switch-workspace` | `INTEGRATION PENDING` |
| `apiGetTenantSubscriptionEntitlement` | `GET` | `/api/v1/tenant/subscription` | `INTEGRATION PENDING` |

---

## 3. Authentication, Users, Roles & Staff APIs

| File | Endpoints Covered | Live Status |
| --- | --- | --- |
| `authApi.js` (144L) | `POST /api/v1/auth/register`, `send-otp`, `verify-otp`, `login`, `forgot-password`, `reset-password`; `GET /api/v1/auth/me` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `customerAuthApi.js` (61L) | `/api/v1/customer-auth/{register,login,verify-otp,resend-otp,forgot-password,reset-password,refresh-token,logout}` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `userApi.js` (37L) | `GET/POST /api/v1/users`, `GET/PUT/DELETE /api/v1/users/{id}`, `PUT /api/v1/users/{id}/password` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `roleApi.js` (18L) | `GET /api/v1/roles`, `GET /api/v1/roles/{roleId}` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `staffApi.js` (32L) | `GET/POST /api/v1/staff`, `PUT/DELETE /api/v1/staff/{id}` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `attendanceApi.js` (39L) | `GET /api/v1/employees/attendance`, `POST /api/v1/employees/attendance/check-in`, `check-out` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `salaryPaymentApi.js` (25L) | `GET/POST /api/v1/salary-payments` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |

---

## 4. POS, Orders, Tables, KOT, Kitchen, Bar & Billing APIs

| File | Endpoints Covered | Live Status |
| --- | --- | --- |
| `tableApi.js` (125L) | `GET/POST /api/v1/tables`, `PUT/DELETE /api/v1/tables/{id}`, `POST /transfer`, `/{id}/vacate`, `/{id}/status`, `GET /locks`, `POST /{id}/lock`, `/{id}/unlock` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `orderApi.js` (334L) | `/api/v1/orders`, `/active`, `/takeaway`, `/table/{tableId}`, `/self-service*`, `/{id}/kot`, `/items*`, `/bill`, `/settle`, `/cancel`, `/dispatch`, `/guests`, `/discount`, `/service-charge`, `/bill-summary`, `/receipt` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `takeawayAdminApi.js` (76L) | `/api/v1/admin/takeaway/{orders,orders/summary,orders/{id},orders/{id}/status,orders/{id}/cancel,menu,menu/search,categories,calculate,invoices/{id}}` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `kotApi.js` (53L) | `/api/v1/kot/orders`, `/summary`, `/{id}`, `/{id}/status`, `/{id}/mark-all-prepared`, `/{kotId}/items/{itemId}/advance`, `/{orderId}/items/{itemId}/status`, `POST /api/v1/orders/{orderId}/kot` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `kitchenApi.js` (40L) | Active kitchen tickets, start ticket, complete ticket, update kitchen item status | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `barApi.js` (614L) | `/api/v1/bar/tables*`, `/api/v1/bar/drinks*`, `/api/v1/bar/overview`, `/api/v1/bar/orders`, `/api/v1/bar/staff*`, `/api/v1/bar/bot/*` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `billingApi.js` (41L) | `POST /api/v1/bills`, `GET /api/v1/bills/{billId}`, `/payment-summary`, `/payments`, `POST /cash-payment`, `POST /settle` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `invoiceApi.js` (123L) | `GET/POST /api/v1/invoices`, `GET/PUT/DELETE /{id}`, `GET /by-order/{orderId}`, `/{id}/status`, `/{id}/settle`, `/{id}/receipt`, `/{id}/pdf`, `/{id}/payments`, `/{id}/payment-summary` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |

---

## 5. Menu, Inventory, Suppliers, Customers, Reservations, Delivery, Reports & Accounting APIs

| File | Endpoints Covered | Live Status |
| --- | --- | --- |
| `menuApi.js` (335L) | `GET/POST /api/v1/menu-items`, `PUT/DELETE /{id}`, `/categories`, `POST /upload-image`, availability & special toggles | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `inventoryApi.js` (213L) | `GET/POST/PUT/DELETE /api/v1/inventory*`, `/ingredients*`, `/adjust`, `/purchases`, `/low-stock`, `/categories`, `/transactions` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `supplierApi.js` (81L) | `GET/POST/PUT/DELETE /api/v1/suppliers*`, `/{id}/purchases`, `/purchase-orders*` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `customerApi.js` (51L) | `GET/POST /api/v1/customers`, `GET/PUT/DELETE /api/v1/customers/{id}` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `reservationApi.js` (418L) | Public availability, tables, OTP, customer reservations/orders/visit-history, admin CRUD/status/payments | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `deliveryApi.js` (44L) | `GET/POST /api/v1/delivery-orders`, `/{id}/status`, `/{id}/driver` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `promotionApi.js` (42L) | `GET/POST /api/v1/promotions`, `POST /validate`, `DELETE /{id}` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `reportApi.js` (149L) | `/api/v1/reports/{dashboard,daily-sales,monthly-sales,kot,inventory,low-stock,top-selling,payments,category-sales,revenue,inventory-purchases,inventory-purchase-summary,salary,salary-summary,payroll-budget}` | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `accountingApi.js` (81L) | `/api/v1/accounting/{chart-of-accounts,journal-entries,daily-balances,summary}` (Phase 3.21: `accountingService.js` now tracks sync success/failure, preserves `localStorage`, and supports manual `retryAccountingSync` per record key without silent `.catch(() => {})`) | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `auditApi.js` (50L) | `/api/v1/audit/{logs,summary}` + export URL helper | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
| `settingsApi.js` (23L) | `GET/PUT /api/v1/restaurant-settings` (+ direct `/api/v1/settings/theme` in `AdminSettings.jsx` & `RealTimeProvider.jsx`) | `API CALL PRESENT – LIVE VERIFICATION PENDING` |
