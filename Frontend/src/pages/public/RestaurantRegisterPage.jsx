import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/publicSaas.css";
import PublicNavbar from "../../components/public/PublicNavbar";
import PublicFooter from "../../components/public/PublicFooter";
import { apiRegisterRestaurant } from "../../api/saasPublicApi";
import { getPasswordStrength, validateRestaurantRegistration } from "../../utils/saasValidation";

const INITIAL_REGISTER_STATE = {
  organizationName: "",
  restaurantName: "",
  branchName: "",
  ownerName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  city: "",
  address: "",
  gstin: "",
};

export default function RestaurantRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_REGISTER_STATE);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [approvedSubmission, setApprovedSubmission] = useState(null);
  const submittingRef = useRef(false);

  const passwordStrength = getPasswordStrength(form.password);

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setSubmitResult(null);

    const validation = validateRestaurantRegistration(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await apiRegisterRestaurant(form);
      setSubmitResult(result);
      if (result.success) {
        setApprovedSubmission({
          organizationName: form.organizationName.trim(),
          restaurantName: form.restaurantName.trim(),
          branchName: form.branchName.trim(),
          ownerName: form.ownerName.trim(),
          email: form.email.trim().toLowerCase(),
          city: form.city.trim(),
          status: result.data?.status || "PendingApproval",
        });
        setForm(INITIAL_REGISTER_STATE);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="saas-page">
      <PublicNavbar />
      <main className="saas-section">
        <div className="saas-container" style={{ maxWidth: 880 }}>
          <div className="saas-section-header" style={{ marginBottom: 32 }}>
            <span className="saas-eyebrow">Restaurant Onboarding</span>
            <h1 className="saas-h1" style={{ fontSize: "clamp(28px, 3.8vw, 42px)" }}>
              Register Your Restaurant Organization
            </h1>
            <p className="saas-lead">
              Set up your Organization, Restaurant Brand, and Primary Branch. New registrations enter
              platform review before tenant activation.
            </p>
          </div>

          {approvedSubmission ? (
            <section
              className="saas-form-card"
              aria-label="Registration pending approval"
              role="status"
            >
              <div className="saas-alert saas-alert-success">
                <strong>Application Received — Status: {approvedSubmission.status}</strong>
              </div>
              <h2 className="saas-h2" style={{ fontSize: 24, marginBottom: 10 }}>
                Your Restaurant Registration Is Pending Platform Approval
              </h2>
              <p className="saas-card-text" style={{ marginBottom: 18 }}>
                Our platform team reviews new restaurant organizations before activating branch POS,
                KOT, and Admin access. You will receive an email once your tenant is approved.
              </p>
              <div className="saas-card" style={{ marginBottom: 20 }}>
                <div><strong>Organization:</strong> {approvedSubmission.organizationName}</div>
                <div><strong>Restaurant Brand:</strong> {approvedSubmission.restaurantName}</div>
                <div><strong>Primary Branch:</strong> {approvedSubmission.branchName} ({approvedSubmission.city})</div>
                <div><strong>Owner:</strong> {approvedSubmission.ownerName} · {approvedSubmission.email}</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <button
                  type="button"
                  className="saas-btn saas-btn-primary"
                  onClick={() => navigate("/")}
                >
                  Return to Home
                </button>
                <button
                  type="button"
                  className="saas-btn saas-btn-secondary"
                  onClick={() => navigate("/login")}
                >
                  Go to Staff Login
                </button>
              </div>
            </section>
          ) : (
            <form
              className="saas-form-card"
              onSubmit={handleSubmit}
              noValidate
              aria-label="Restaurant registration form"
            >
              {submitResult && !submitResult.success && (
                <div
                  className={`saas-alert ${submitResult.blocked ? "saas-alert-warning" : "saas-alert-error"}`}
                  role="alert"
                >
                  <strong>{submitResult.blocked ? "Integration Pending: " : "Registration Failed: "}</strong>
                  {submitResult.error}
                </div>
              )}

              <div className="saas-form-grid">
                <div className="saas-field">
                  <label className="saas-label" htmlFor="reg-org">
                    Organization Name *
                  </label>
                  <input
                    id="reg-org"
                    type="text"
                    className="saas-input"
                    value={form.organizationName}
                    onChange={handleChange("organizationName")}
                    placeholder="e.g. Golden Fork Hospitality Pvt Ltd"
                    aria-invalid={Boolean(errors.organizationName)}
                  />
                  {errors.organizationName && (
                    <span className="saas-field-error">{errors.organizationName}</span>
                  )}
                </div>

                <div className="saas-field">
                  <label className="saas-label" htmlFor="reg-restaurant">
                    Restaurant / Brand Name *
                  </label>
                  <input
                    id="reg-restaurant"
                    type="text"
                    className="saas-input"
                    value={form.restaurantName}
                    onChange={handleChange("restaurantName")}
                    placeholder="e.g. The Spice Courtyard"
                    aria-invalid={Boolean(errors.restaurantName)}
                  />
                  {errors.restaurantName && (
                    <span className="saas-field-error">{errors.restaurantName}</span>
                  )}
                </div>

                <div className="saas-field">
                  <label className="saas-label" htmlFor="reg-branch">
                    Primary Branch Name *
                  </label>
                  <input
                    id="reg-branch"
                    type="text"
                    className="saas-input"
                    value={form.branchName}
                    onChange={handleChange("branchName")}
                    placeholder="e.g. Indiranagar Flagship"
                    aria-invalid={Boolean(errors.branchName)}
                  />
                  {errors.branchName && (
                    <span className="saas-field-error">{errors.branchName}</span>
                  )}
                </div>

                <div className="saas-field">
                  <label className="saas-label" htmlFor="reg-owner">
                    Owner Full Name *
                  </label>
                  <input
                    id="reg-owner"
                    type="text"
                    className="saas-input"
                    value={form.ownerName}
                    onChange={handleChange("ownerName")}
                    placeholder="e.g. Priya Sharma"
                    autoComplete="name"
                    aria-invalid={Boolean(errors.ownerName)}
                  />
                  {errors.ownerName && (
                    <span className="saas-field-error">{errors.ownerName}</span>
                  )}
                </div>

                <div className="saas-field">
                  <label className="saas-label" htmlFor="reg-email">
                    Owner Work Email *
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    className="saas-input"
                    value={form.email}
                    onChange={handleChange("email")}
                    placeholder="owner@restaurant.com"
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email && <span className="saas-field-error">{errors.email}</span>}
                </div>

                <div className="saas-field">
                  <label className="saas-label" htmlFor="reg-phone">
                    Indian Mobile Number *
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    className="saas-input"
                    value={form.phone}
                    onChange={handleChange("phone")}
                    placeholder="e.g. +91 9876543210"
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone && <span className="saas-field-error">{errors.phone}</span>}
                </div>

                <div className="saas-field">
                  <label className="saas-label" htmlFor="reg-password">
                    Password *
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    className="saas-input"
                    value={form.password}
                    onChange={handleChange("password")}
                    placeholder="Min 8 chars, letters + numbers"
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.password)}
                  />
                  {form.password && (
                    <span
                      style={{
                        fontSize: 12,
                        color:
                          passwordStrength.label === "Strong"
                            ? "#4ade80"
                            : passwordStrength.label === "Fair"
                              ? "#fbbf24"
                              : "#fca5a5",
                      }}
                    >
                      Password strength: {passwordStrength.label}
                    </span>
                  )}
                  {errors.password && (
                    <span className="saas-field-error">{errors.password}</span>
                  )}
                </div>

                <div className="saas-field">
                  <label className="saas-label" htmlFor="reg-confirm-password">
                    Confirm Password *
                  </label>
                  <input
                    id="reg-confirm-password"
                    type="password"
                    className="saas-input"
                    value={form.confirmPassword}
                    onChange={handleChange("confirmPassword")}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.confirmPassword)}
                  />
                  {errors.confirmPassword && (
                    <span className="saas-field-error">{errors.confirmPassword}</span>
                  )}
                </div>

                <div className="saas-field">
                  <label className="saas-label" htmlFor="reg-city">
                    City *
                  </label>
                  <input
                    id="reg-city"
                    type="text"
                    className="saas-input"
                    value={form.city}
                    onChange={handleChange("city")}
                    placeholder="e.g. Bengaluru"
                    aria-invalid={Boolean(errors.city)}
                  />
                  {errors.city && <span className="saas-field-error">{errors.city}</span>}
                </div>

                <div className="saas-field">
                  <label className="saas-label" htmlFor="reg-gstin">
                    GSTIN (Optional)
                  </label>
                  <input
                    id="reg-gstin"
                    type="text"
                    className="saas-input"
                    value={form.gstin}
                    onChange={handleChange("gstin")}
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    aria-invalid={Boolean(errors.gstin)}
                  />
                  {errors.gstin && <span className="saas-field-error">{errors.gstin}</span>}
                </div>

                <div className="saas-field saas-field-full">
                  <label className="saas-label" htmlFor="reg-address">
                    Branch Address *
                  </label>
                  <textarea
                    id="reg-address"
                    className="saas-textarea"
                    value={form.address}
                    onChange={handleChange("address")}
                    placeholder="Street, building, landmark, and PIN code"
                    aria-invalid={Boolean(errors.address)}
                  />
                  {errors.address && (
                    <span className="saas-field-error">{errors.address}</span>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 22,
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  className="saas-btn saas-btn-ghost"
                  onClick={() => navigate("/login")}
                >
                  Already registered? Staff Login
                </button>
                <button type="submit" className="saas-btn saas-btn-primary" disabled={submitting}>
                  {submitting ? "Submitting Registration..." : "Submit Restaurant Registration"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
