import React, { useCallback, useEffect, useState } from "react";
import { apiGetPlatformSettings, apiSavePlatformSettings } from "../../api/superAdminApi";
import { SaModuleHeader, SaStateBanner } from "../../components/superadmin/SuperAdminUI";

const DEFAULT_FORM = {
  platformName: "RestroFlow OS",
  requireManualApproval: true,
  defaultCurrency: "INR",
  defaultTaxRate: "5",
  notifyOnRegistration: true,
  maintenanceBannerEnabled: false,
  maintenanceBannerText: "",
  enableMultiBranchOnboarding: true,
  enableSelfServiceQr: true,
};

export default function SettingsModule() {
  const [state, setState] = useState({ loading: true, res: null });
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saveBanner, setSaveBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const res = await apiGetPlatformSettings();
    setState({ loading: false, res });
    if (res.success && res.data) {
      setForm((prev) => ({ ...prev, ...res.data }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setSaveBanner(null);
    try {
      const res = await apiSavePlatformSettings(form);
      setSaveBanner(res);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SaModuleHeader
        title="Platform Settings"
        subtitle="Global SaaS branding, registration approval policy, currency/tax defaults, maintenance banner, and feature flags."
      />

      <SaStateBanner
        loading={state.loading}
        integrationPending={state.res?.integrationPending}
        error={state.res && !state.res.success ? state.res.error : ""}
        endpoint={state.res?.endpoint}
        onRetry={load}
      />

      {saveBanner && (
        <div
          className={`sa-banner ${saveBanner.success ? "sa-banner-success" : saveBanner.integrationPending ? "sa-banner-pending" : "sa-banner-error"}`}
          role="alert"
        >
          {saveBanner.success ? "Platform settings saved." : saveBanner.error}
        </div>
      )}

      <form onSubmit={handleSave} className="sa-card sa-form-grid">
        <div className="sa-field">
          <label className="sa-label" htmlFor="sa-set-name">Platform Branding Name</label>
          <input
            id="sa-set-name"
            className="sa-input"
            value={form.platformName}
            onChange={(e) => setForm((p) => ({ ...p, platformName: e.target.value }))}
          />
        </div>

        <div className="sa-field">
          <label className="sa-label" htmlFor="sa-set-curr">Default Currency</label>
          <select
            id="sa-set-curr"
            className="sa-select"
            value={form.defaultCurrency}
            onChange={(e) => setForm((p) => ({ ...p, defaultCurrency: e.target.value }))}
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="AED">AED</option>
          </select>
        </div>

        <div className="sa-field">
          <label className="sa-label" htmlFor="sa-set-tax">Default Tax Rate (%)</label>
          <input
            id="sa-set-tax"
            type="number"
            min="0"
            max="28"
            className="sa-input"
            value={form.defaultTaxRate}
            onChange={(e) => setForm((p) => ({ ...p, defaultTaxRate: e.target.value }))}
          />
        </div>

        <div className="sa-field">
          <label className="sa-label" htmlFor="sa-set-banner-txt">Maintenance Banner Text</label>
          <input
            id="sa-set-banner-txt"
            className="sa-input"
            value={form.maintenanceBannerText}
            onChange={(e) => setForm((p) => ({ ...p, maintenanceBannerText: e.target.value }))}
            placeholder="Optional scheduled maintenance notice"
          />
        </div>

        <div className="sa-field sa-field-full" style={{ gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <input
              type="checkbox"
              checked={Boolean(form.requireManualApproval)}
              onChange={(e) => setForm((p) => ({ ...p, requireManualApproval: e.target.checked }))}
            />
            Require Super Admin approval for new restaurant registrations
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <input
              type="checkbox"
              checked={Boolean(form.notifyOnRegistration)}
              onChange={(e) => setForm((p) => ({ ...p, notifyOnRegistration: e.target.checked }))}
            />
            Email platform admins when new registrations arrive
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <input
              type="checkbox"
              checked={Boolean(form.maintenanceBannerEnabled)}
              onChange={(e) => setForm((p) => ({ ...p, maintenanceBannerEnabled: e.target.checked }))}
            />
            Show maintenance banner globally
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <input
              type="checkbox"
              checked={Boolean(form.enableMultiBranchOnboarding)}
              onChange={(e) => setForm((p) => ({ ...p, enableMultiBranchOnboarding: e.target.checked }))}
            />
            Feature Flag: Multi-Branch Onboarding
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <input
              type="checkbox"
              checked={Boolean(form.enableSelfServiceQr)}
              onChange={(e) => setForm((p) => ({ ...p, enableSelfServiceQr: e.target.checked }))}
            />
            Feature Flag: Self-Service QR Menus
          </label>
        </div>

        <div className="sa-field sa-field-full" style={{ alignItems: "flex-end" }}>
          <button type="submit" className="sa-btn sa-btn-primary" disabled={busy}>
            {busy ? "Saving..." : "Save Platform Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
