const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Normalize phone input by stripping formatting spaces, hyphens, parentheses, and leading +91 / 0.
 * @param {string} value
 * @returns {string}
 */
export function normalizePhone(value) {
  let digits = String(value || "").replace(/[\s\-()+]/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Validate an Indian 10-digit mobile number (starts with 6-9, optional +91 or 0 prefix).
 * @param {string} value
 * @returns {boolean}
 */
export function isValidIndianPhone(value) {
  return INDIAN_MOBILE_REGEX.test(normalizePhone(value));
}

/**
 * Evaluate password strength for UI feedback.
 * @param {string} password
 * @returns {{ score: number, label: "Empty" | "Weak" | "Fair" | "Strong" }}
 */
export function getPasswordStrength(password) {
  const pwd = String(password || "");
  if (!pwd) return { score: 0, label: "Empty" };
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (score <= 1) return { score, label: "Weak" };
  if (score <= 3) return { score, label: "Fair" };
  return { score, label: "Strong" };
}

/**
 * Validate the public Restaurant Registration form fields.
 * @param {Record<string, any>} values
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateRestaurantRegistration(values = {}) {
  const errors = {};
  const trim = (k) => String(values[k] ?? "").trim();

  if (trim("organizationName").length < 2) {
    errors.organizationName = "Organization name must be at least 2 characters.";
  }
  if (trim("restaurantName").length < 2) {
    errors.restaurantName = "Restaurant name must be at least 2 characters.";
  }
  if (trim("branchName").length < 2) {
    errors.branchName = "Primary branch name must be at least 2 characters.";
  }
  if (trim("ownerName").length < 2) {
    errors.ownerName = "Owner full name must be at least 2 characters.";
  }

  const email = trim("email");
  if (!email) {
    errors.email = "Work email is required.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const phoneDigits = normalizePhone(values.phone);
  if (!phoneDigits) {
    errors.phone = "Phone number is required.";
  } else if (!INDIAN_MOBILE_REGEX.test(phoneDigits)) {
    errors.phone = "Enter a valid 10-digit Indian mobile number (starting with 6-9, optional +91).";
  }

  const password = String(values.password ?? "");
  if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = "Password must include at least one letter and one number.";
  }

  const confirmPassword = String(values.confirmPassword ?? "");
  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (trim("city").length < 2) {
    errors.city = "City is required.";
  }
  if (trim("address").length < 5) {
    errors.address = "Full street address is required (at least 5 characters).";
  }

  const gstin = trim("gstin").toUpperCase();
  if (gstin && !GSTIN_REGEX.test(gstin)) {
    errors.gstin = "GSTIN must be a valid 15-character Indian GSTIN (or leave blank).";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate the public Demo Request form fields.
 * @param {Record<string, any>} values
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateDemoRequest(values = {}) {
  const errors = {};
  const trim = (k) => String(values[k] ?? "").trim();

  if (trim("name").length < 2) {
    errors.name = "Your name is required.";
  }
  if (trim("restaurantOrOrg").length < 2) {
    errors.restaurantOrOrg = "Restaurant or organization name is required.";
  }

  const email = trim("email");
  if (!email) {
    errors.email = "Work email is required.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const phoneDigits = normalizePhone(values.phone);
  if (!phoneDigits) {
    errors.phone = "Phone number is required.";
  } else if (!INDIAN_MOBILE_REGEX.test(phoneDigits)) {
    errors.phone = "Enter a valid 10-digit Indian mobile number (starting with 6-9, optional +91).";
  }

  const branchCount = Number(values.branchCount);
  if (!Number.isInteger(branchCount) || branchCount < 1 || branchCount > 5000) {
    errors.branchCount = "Enter a valid number of branches (1 or more).";
  }

  if (trim("message").length > 1000) {
    errors.message = "Message cannot exceed 1000 characters.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

const ROLE_ROUTE_MAP = {
  platformsuperadmin: "/super-admin",
  superadmin: "/super-admin",
  restaurantowner: "/admin",
  restaurantadmin: "/admin",
  admin: "/admin",
  branchmanager: "/admin",
  kot: "/kot",
  chef: "/kot",
  cashier: "/pos",
  waiter: "/pos",
  pos: "/pos",
};

/**
 * Resolve the destination route for an authenticated user role.
 * Supports current roles (admin, kot, pos) and prepares future SaaS roles
 * (PlatformSuperAdmin, RestaurantOwner, RestaurantAdmin, BranchManager, Cashier, Waiter, Chef).
 * @param {string} role
 * @returns {string}
 */
export function resolvePostLoginRoute(role) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return ROLE_ROUTE_MAP[normalized] || "/pos";
}
