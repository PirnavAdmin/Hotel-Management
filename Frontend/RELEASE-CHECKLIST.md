# Frontend Release Verification Checklist

## Before Staging Deployment
- [x] Production build completed (`npm --prefix Frontend run build`)
- [x] Unit tests passed (`8/8` suites)
- [x] Playwright frontend regression passed (`15/15` runnable tests in Chrome; `4` credential-gated skipped)
- [x] Oxlint passed (`0` errors)
- [x] Production bundle credential scan clean (`BUNDLE_CREDENTIAL_SCAN_CLEAN`)
- [x] API base URL configuration audited (`apiConfig.js`: `VITE_API_BASE_URL` or same-origin proxy)
- [x] Legacy offline fallback credentials removed (`auth.js`)
- [x] SPA fallback requirement documented (`index.html` fallback for nested routes)

## After Staging Deployment
- [ ] Public SaaS landing page (`/`) loads cleanly
- [ ] Login page (`/login`) loads cleanly
- [ ] Nested routes (`/super-admin/dashboard`, `/r/:branchCode/menu`, `/admin`, `/pos`, `/kot`) survive browser refresh (SPA fallback active)
- [ ] Public SaaS routes (`/pricing`, `/demo`, `/register-restaurant`) load cleanly
- [ ] API requests reach the intended staging backend without CORS or mixed-content errors
- [ ] Authentication verified with legitimate staging accounts (`STAGING_ADMIN_USER`, `STAGING_POS_USER`, `STAGING_KOT_USER`)
- [ ] Admin invoice retrieval (`AdminInvoices`) verified against live staging data
- [ ] POS workflow (order, settlement, receipt) verified with approved staging test procedure
- [ ] KOT/BOT workflow verified against live kitchen queue
- [ ] Multi-branch workspace switching verified (when multi-branch account is provisioned)
- [ ] Browser console free of uncaught runtime/asset errors
- [ ] Responsive layout verified on deployed staging URL

## Before Public Production Release
- [ ] Live authentication and refresh/logout lifecycle verified
- [ ] Backend authorization & RBAC verified server-side
- [ ] Tenant isolation verified by backend team
- [ ] POS settlement & payment-provider behavior verified in staging
- [ ] KOT/BOT dispatch verified in staging
- [ ] Admin invoice retrieval & GST/total accuracy verified in staging
- [ ] HTTPS enforcement and security response headers (CSP, `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`) verified
- [ ] Frontend rollback procedure tested and confirmed
