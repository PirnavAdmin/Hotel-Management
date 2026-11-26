import React, { useRef, useState } from "react";
import { apiSubmitDemoRequest } from "../../api/saasPublicApi";
import { validateDemoRequest } from "../../utils/saasValidation";

const INITIAL_DEMO_STATE = {
  name: "",
  restaurantOrOrg: "",
  email: "",
  phone: "",
  branchCount: "1",
  message: "",
};

export default function DemoRequestForm() {
  const [form, setForm] = useState(INITIAL_DEMO_STATE);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const submittingRef = useRef(false);

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

    const validation = validateDemoRequest(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await apiSubmitDemoRequest(form);
      setSubmitResult(result);
      if (result.success) {
        setForm(INITIAL_DEMO_STATE);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form className="saas-form-card" onSubmit={handleSubmit} noValidate aria-label="Book a demo form">
      {submitResult?.success && (
        <div className="saas-alert saas-alert-success" role="status">
          Demo request received. Our onboarding team will reach out shortly.
        </div>
      )}

      {submitResult && !submitResult.success && (
        <div
          className={`saas-alert ${submitResult.blocked ? "saas-alert-warning" : "saas-alert-error"}`}
          role="alert"
        >
          <strong>{submitResult.blocked ? "Integration Pending: " : "Submission Failed: "}</strong>
          {submitResult.error}
        </div>
      )}

      <div className="saas-form-grid">
        <div className="saas-field">
          <label className="saas-label" htmlFor="demo-name">
            Your Name *
          </label>
          <input
            id="demo-name"
            type="text"
            className="saas-input"
            value={form.name}
            onChange={handleChange("name")}
            placeholder="e.g. Arjun Mehta"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <span className="saas-field-error">{errors.name}</span>}
        </div>

        <div className="saas-field">
          <label className="saas-label" htmlFor="demo-org">
            Restaurant / Organization *
          </label>
          <input
            id="demo-org"
            type="text"
            className="saas-input"
            value={form.restaurantOrOrg}
            onChange={handleChange("restaurantOrOrg")}
            placeholder="e.g. Spice Route Hospitality"
            autoComplete="organization"
            aria-invalid={Boolean(errors.restaurantOrOrg)}
          />
          {errors.restaurantOrOrg && <span className="saas-field-error">{errors.restaurantOrOrg}</span>}
        </div>

        <div className="saas-field">
          <label className="saas-label" htmlFor="demo-email">
            Work Email *
          </label>
          <input
            id="demo-email"
            type="email"
            className="saas-input"
            value={form.email}
            onChange={handleChange("email")}
            placeholder="you@restaurant.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <span className="saas-field-error">{errors.email}</span>}
        </div>

        <div className="saas-field">
          <label className="saas-label" htmlFor="demo-phone">
            Phone Number *
          </label>
          <input
            id="demo-phone"
            type="tel"
            className="saas-input"
            value={form.phone}
            onChange={handleChange("phone")}
            placeholder="e.g. 9876543210"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && <span className="saas-field-error">{errors.phone}</span>}
        </div>

        <div className="saas-field saas-field-full">
          <label className="saas-label" htmlFor="demo-branches">
            Number of Branches *
          </label>
          <input
            id="demo-branches"
            type="number"
            min="1"
            max="5000"
            className="saas-input"
            value={form.branchCount}
            onChange={handleChange("branchCount")}
            aria-invalid={Boolean(errors.branchCount)}
          />
          {errors.branchCount && <span className="saas-field-error">{errors.branchCount}</span>}
        </div>

        <div className="saas-field saas-field-full">
          <label className="saas-label" htmlFor="demo-message">
            Message / Requirements
          </label>
          <textarea
            id="demo-message"
            className="saas-textarea"
            value={form.message}
            onChange={handleChange("message")}
            placeholder="Tell us about your dining room, kitchen stations, or branch count..."
            aria-invalid={Boolean(errors.message)}
          />
          {errors.message && <span className="saas-field-error">{errors.message}</span>}
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="saas-btn saas-btn-primary" disabled={submitting}>
          {submitting ? "Submitting Request..." : "Request Live Demo"}
        </button>
      </div>
    </form>
  );
}
