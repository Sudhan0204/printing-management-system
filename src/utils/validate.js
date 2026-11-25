export const LIMITS = {
  customer_name: { min: 2, max: 100 },
  business_name: { min: 2, max: 150 },
  owner_name: { min: 2, max: 100 },
  product_name: { min: 2, max: 100 },
  category: { min: 0, max: 100 },
  city: { min: 2, max: 100 },
  state: { min: 2, max: 100 },
  address: { min: 0, max: 250 },
  email: { min: 5, max: 254 },
  phone: { min: 10, max: 10 },
  notes: { min: 0, max: 500 },
  description: { min: 0, max: 500 },
  reference_number: { min: 0, max: 100 },
  password: { min: 8, max: 64 },
};

export function normalizePhone(value) {
  let phone = String(value || "").replace(/[\s\-()]/g, "");
  if (phone.startsWith("+91")) phone = phone.slice(3);
  else if (phone.startsWith("91") && phone.length === 12) phone = phone.slice(2);
  return phone.replace(/\D/g, "");
}

export function digitsOnly(value, maxLength = 10) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, maxLength);
}

export function hasControlChars(value) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(String(value || ""));
}

export function validateRequired(value, label = "This field") {
  if (!String(value ?? "").trim()) {
    return label === "This field" ? "This field is required." : `${label} is required.`;
  }
  return null;
}

export function validateLength(value, { min = 0, max = 255, label = "This field", required = true } = {}) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return required ? (label === "This field" ? "This field is required." : `${label} is required.`) : null;
  }

  if (hasControlChars(trimmed)) {
    return `${label} contains invalid characters.`;
  }

  if (trimmed.length < min) {
    return `${label} must be between ${min} and ${max} characters.`;
  }

  if (trimmed.length > max) {
    return `${label} cannot exceed ${max} characters.`;
  }

  return null;
}

export function validateName(value, label = "Name", { min = 2, max = 100 } = {}) {
  return validateLength(value, { min, max, label, required: true });
}

export function validateIndianMobile(value, { required = true } = {}) {
  const phone = normalizePhone(value);
  if (!phone) return required ? "This field is required." : null;
  if (!/^[6-9][0-9]{9}$/.test(phone)) {
    return "Enter a valid 10-digit Indian mobile number.";
  }
  return null;
}

export function validateEmail(value, required = false) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return required ? "This field is required." : null;

  if (email.length < 5 || email.length > 254) {
    return "Enter a valid email address.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }

  // Reject incomplete domains like abc@gmail
  const domain = email.split("@")[1] || "";
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
    return "Enter a valid email address.";
  }

  return null;
}

export function validateIndianPincode(value) {
  const pincode = String(value || "").trim();
  if (!pincode) return "This field is required.";
  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    return "Enter a valid 6-digit Indian pincode.";
  }
  return null;
}

export function validateStrongPassword(password, confirmation) {
  const value = String(password || "");
  if (!value) return "Password is required.";

  if (
    value.length < 8 ||
    value.length > 64 ||
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    return "Password must contain at least 8 characters, including uppercase, lowercase, number and special character.";
  }

  if (confirmation !== undefined && value !== String(confirmation || "")) {
    return "Password confirmation does not match.";
  }

  return null;
}

export function passwordStrength(password) {
  const value = String(password || "");
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (score <= 2) return { score, label: "Weak" };
  if (score <= 4) return { score, label: "Medium" };
  return { score, label: "Strong" };
}

export function validateMoney(value, label = "Amount", { allowZero = false, required = true } = {}) {
  if (value === "" || value === null || value === undefined) {
    return required ? `${label} is required.` : null;
  }

  const raw = String(value).trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) {
    return `${label} must be a valid number with up to 2 decimal places.`;
  }

  const number = Number(raw);
  if (!Number.isFinite(number)) return `${label} must be a valid number.`;

  if (allowZero) {
    if (number < 0) return `${label} cannot be negative.`;
  } else if (number <= 0) {
    return `${label} must be greater than zero.`;
  }

  return null;
}

export function validatePositiveNumber(
  value,
  label = "Value",
  { allowZero = false, maxDecimals = 4, required = true } = {}
) {
  if (value === "" || value === null || value === undefined) {
    return required ? `${label} is required.` : null;
  }

  const raw = String(value).trim();
  const decimalPattern = new RegExp(`^-?\\d+(\\.\\d{1,${maxDecimals}})?$`);
  if (!decimalPattern.test(raw)) {
    return `${label} must be a valid number with up to ${maxDecimals} decimal places.`;
  }

  const number = Number(raw);
  if (!Number.isFinite(number)) return `${label} must be a valid number.`;

  if (allowZero) {
    if (number < 0) return `${label} cannot be negative.`;
  } else if (number <= 0) {
    return `${label} must be greater than zero.`;
  }

  return null;
}

export function firstErrorKey(errors) {
  return Object.keys(errors || {})[0] || null;
}

export function focusField(name) {
  const el = document.querySelector(`[name="${name}"], #${CSS.escape(name)}`);
  if (el && typeof el.focus === "function") {
    el.focus();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export function mapApiErrors(error) {
  const payload = error?.response?.data;
  if (payload?.errors && typeof payload.errors === "object" && !Array.isArray(payload.errors)) {
    return payload.errors;
  }
  if (Array.isArray(payload?.errors)) {
    return { form: payload.errors[0] || payload.message };
  }
  return { form: payload?.message || "Something went wrong." };
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];
