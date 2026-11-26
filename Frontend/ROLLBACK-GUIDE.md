# Frontend-Only Rollback Guide

> **Important Scope Note:** A frontend rollback restores only static UI assets (`Frontend/dist/`). It **cannot** reverse backend database writes, settled orders, invoices, or payment transactions.

## Rollback Procedure

1. **Identify the currently deployed frontend release:** Record the active release tag, timestamp, or build manifest (`RELEASE-MANIFEST.md`).
2. **Identify the previous known-good frontend artifact:** Locate the archived `dist/` build from the last verified release.
3. **Preserve the currently deployed artifact for investigation:** Copy/archive the failing `dist/` bundle and browser error logs before replacing files so root cause can be investigated.
4. **Restore the previous frontend artifact:** Replace the served static directory with the previous known-good `dist/` bundle using the authorized deployment pipeline.
5. **Verify the landing page (`/`):** Confirm `index.html` and hashed JS/CSS assets under `/assets/` load with HTTP 200.
6. **Verify login and protected-route behavior (`/login`, `/pos`, `/kot`, `/admin`):** Confirm login gates render and unauthenticated access remains blocked.
7. **Verify API connectivity:** Confirm API calls reach the expected backend base URL without unexpected `404`/`500` asset or proxy errors.
8. **Verify critical browser routes:** Refresh nested routes (`/super-admin/dashboard`, `/menu`, `/pricing`) to confirm SPA fallback continues working.
9. **Record the rollback result:** Log timestamp, restored release identifier, and observed verification results.
