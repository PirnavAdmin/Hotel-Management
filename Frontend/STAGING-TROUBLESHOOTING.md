# Frontend Staging Troubleshooting Guide

> **Security Rule:** Never paste passwords, JWTs, or `Authorization` headers into bug reports, tickets, or screenshots.

| Issue | User-Visible Symptom | Frontend-Side Checks | Browser DevTools Checks | Escalation Owner | Evidence to Collect (Sanitized) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Blank page after deployment** | Empty white/dark screen | Verify `dist/index.html` exists and base path is `/` | Console errors (`SyntaxError`, failed module load) | Hosting / Frontend | Console error message, failing asset path |
| **Missing JS or CSS assets** | Unstyled page or broken lazy route | Confirm full `dist/assets/` folder was deployed | Network tab: `404` on `/assets/*.js` or `*.css` | Hosting | Failing asset URL & HTTP status |
| **Nested route returns 404 / refresh failure** | `/super-admin/tenants` or `/menu` gives 404 on reload | Verify SPA host fallback to `index.html` | Network tab: document request returns `404` | Hosting | Route URL & server `404` status |
| **API network errors** | "Cannot reach the server" banner | Check `VITE_API_BASE_URL` / same-origin proxy | Network tab: `(failed)`, CORS, or `502`/`503` | Backend / Hosting | Request path, HTTP status, CORS message |
| **401 authentication failure / expired session** | Redirected/reset to login screen | Confirm clock/token `exp` wasn't already expired | Network tab: `401` on `/api/v1/auth/me` or API | Backend / Auth | Endpoint path & `401` status (no token!) |
| **403 permission failure** | Access denied / missing capability | Check user's backend-issued role/permissions | Network tab: `403` response message | Backend RBAC | User role name (not password) & endpoint |
| **404 missing resource** | `Integration Pending` or "not found" banner | Verify feature is implemented on target backend | Network tab: `404` on `/api/v1/...` | Backend | Endpoint path & `404` status |
| **409 conflict** | Duplicate/conflict validation message | Check concurrent edit or duplicate record | Network tab: `409` JSON `message` | Backend / User | Sanitized `409` response message |
| **429 rate limiting** | "Too many requests" notice | Confirm no accidental rapid re-click loop | Network tab: `429` + `Retry-After` header | Backend / Hosting | Endpoint path & `Retry-After` seconds |
| **500 server error** | Generic "unexpected server error" message | Frontend intentionally hides raw stack traces | Network tab: `500` response status | Backend | Endpoint path, timestamp, request ID |
| **Workspace switching failure** | Active branch does not change; error shown | Verify `WorkspaceSwitcher` kept previous state | Network tab: `/api/v1/workspaces/switch-context` | Backend | Endpoint status & error message |
| **POS settlement / KOT/BOT dispatch failure** | Error banner; order stays unsettled/pending | Verify submit button re-enables for retry | Network tab: `4xx`/`5xx` on settle/KOT API | Backend | Order ID, endpoint, HTTP status |
| **Admin invoice loading failure** | Error state in `AdminInvoices` | Click Refresh; check `requestInvoiceManagementRecords` | Network tab: `/api/v1/invoices` status | Backend | HTTP status & sanitized error text |
