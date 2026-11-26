# Frontend-to-Backend Integration Handover

This document separates verified frontend capabilities from pending backend and hosting dependencies.

| Integration Item | Expected Frontend Workflow | Verified in Frontend | Untested / Pending | Required Evidence to Verify | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Staging test credentials** | Configure `STAGING_ADMIN_USER`, `STAGING_POS_USER`, `STAGING_KOT_USER` in CI/staging env | Parameterized in `staging-integration.spec.js` | Live staging credential login | `test:e2e` passing without skips | Backend / QA |
| **Live authentication** | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | Fail-closed login UI, expired-JWT & mock-token rejection | Real JWT issuance & reload persistence | Staging Admin/POS/KOT login pass | Backend |
| **Refresh-token rotation** | Silent refresh before expiry | Not implemented in frontend | Token refresh endpoint & client hook | Backend contract + E2E expiry test | Backend + Frontend |
| **Server-side logout / revocation** | Invalidate token server-side on logout | Client clears `AUTH_SESSION_STORAGE_KEYS` | Token rejected after logout on server | `401` returned for revoked token | Backend |
| **Server-side JWT validation & RBAC** | Enforce roles & `permissions[]` on all APIs | `PermissionGuard` & `isAllowedForRoute` fail closed | Server-enforced `403` for unauthorized roles | API `403` verification tests | Backend |
| **Tenant isolation** | Scope queries by `tenantId` / `restaurantId` / `branchId` | UI separates workspaces cleanly | Cross-tenant access blocked on server | Cross-tenant negative API tests | Backend |
| **Public registration & demo APIs** | Submit `/register-restaurant` & `/demo` forms | Client validation, duplicate-submit guard, `Integration Pending` | Live persistence & `PendingApproval` return | HTTP `200`/`201` from backend | Backend |
| **Super Admin APIs** | 11 modules under `/super-admin/*` | All 11 UIs, modals, filters, `Integration Pending` | Live CRUD & approve/reject workflows | Backend `/api/v1/super-admin/*` pass | Backend |
| **Workspace & Subscription APIs** | `WorkspaceSwitcher` & `TenantWorkspaceOverview` | Cascade UI, state preserved on failure | Authorized list, context switch, plan limits | Backend `/api/v1/workspaces/*` & `/tenant/subscription` | Backend |
| **Admin invoice retrieval** | Load `GET /api/v1/invoices`, filter, CSV, receipt | Financial summary, day-wise breakdown, reconciliation | Live backend invoice dataset rendering | Live `AdminInvoices` staging test | Backend + QA |
| **POS settlement & payment provider** | Dine-In/Takeaway settle & Cash/UPI/Card | UI prevents duplicate submit & fake success | Real settlement & payment confirmation | Staging settlement E2E pass | Backend |
| **KOT / BOT dispatch** | Kitchen & Bar order queue & status updates | UI routes & auth gates | Live ticket dispatch & status sync | Staging KOT/BOT E2E pass | Backend |
| **HTTPS, CSP & security headers** | Enforce HTTPS, CSP, `frame-ancestors`, `X-Content-Type-Options` | Static bundle scan clean; no `dangerouslySetInnerHTML` | Response headers on deployed host | `curl -I` / browser header audit | Hosting |
| **HTTP-only cookie auth (if adopted)** | Move JWT out of `localStorage` | `localStorage` XSS limitation documented | Cookie flags (`HttpOnly`, `Secure`, `SameSite`) | Backend + Frontend auth update | Backend + Hosting |
