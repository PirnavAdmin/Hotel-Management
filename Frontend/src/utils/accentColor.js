export const ACCENT_STORAGE_KEY = "gourmet_pos_accent_v1";

export const ACCENT_COLORS = [
  { id: "orange", name: "Orange", value: "#f59e0b", light: "#b45309", gradientEnd: "#ea580c" },
  { id: "blue", name: "Blue", value: "#3b82f6", light: "#1d4ed8", gradientEnd: "#2563eb" },
  { id: "purple", name: "Purple", value: "#a855f7", light: "#7e22ce", gradientEnd: "#9333ea" },
  { id: "green", name: "Green", value: "#22c55e", light: "#15803d", gradientEnd: "#16a34a" },
  { id: "red", name: "Red", value: "#ef4444", light: "#b91c1c", gradientEnd: "#dc2626" },
  { id: "teal", name: "Teal", value: "#14b8a6", light: "#0f766e", gradientEnd: "#0d9488" },
  { id: "pink", name: "Pink", value: "#ec4899", light: "#be185d", gradientEnd: "#db2777" },
  { id: "indigo", name: "Indigo", value: "#6366f1", light: "#4338ca", gradientEnd: "#4f46e5" },
];

export function getSavedAccent() {
  try {
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (saved && /^#[\da-f]{6}$/i.test(saved)) return saved.toLowerCase();
    const preset = ACCENT_COLORS.find((color) => color.id === saved);
    return preset?.value || "#f59e0b";
  } catch {
    return "#f59e0b"
  }
}

export function applyAccent(value, { persist = true } = {}) {
  const hex = updateAccentVariables(value);
  if (persist) {
    try { localStorage.setItem(ACCENT_STORAGE_KEY, hex); } catch {}
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("accent-changed", { detail: hex }));
  }
  return hex;
}

export function updateAccentVariables(value, theme = typeof document !== "undefined" ? document.documentElement.dataset.theme : "royal-saffron") {
  const hex = /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : "#f59e0b";
  const gradientEnd = mixHex(hex, "#000000", 0.12);
  const hsl = hexToHsl(hex);
  // Accent identity is independent of light/dark mode. Keep the chosen HEX
  // intact; derived states provide contrast in each mode.
  const active = hex;
  const luminance = relativeLuminance(active);
  const lightContrast = 1.05 / (luminance + 0.05);
  const darkLuminance = relativeLuminance("#0f172a");
  const darkContrast = (luminance + 0.05) / (darkLuminance + 0.05);
  const contrast = darkContrast >= lightContrast ? "#0f172a" : "#ffffff";
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.dataset.accent = hex;
    if (document.body) document.body.dataset.accent = hex;
    root.style.setProperty("--accent-primary", hex);
    root.style.setProperty("--color-primary", hex);
    root.style.setProperty("--color-primary-hover", hslToHex(hsl.h, hsl.s, Math.max(18, hsl.l - (theme === "light-bistro" ? 8 : 10))));
    root.style.setProperty("--color-primary-active", hslToHex(hsl.h, hsl.s, Math.max(16, hsl.l - 15)));
    root.style.setProperty("--color-primary-light", hslToHex(hsl.h, hsl.s, Math.min(94, hsl.l + 24)));
    root.style.setProperty("--color-primary-dark", hslToHex(hsl.h, hsl.s, Math.max(18, hsl.l - 24)));
    root.style.setProperty("--color-accent", hex);
    root.style.setProperty("--color-background", "var(--bg-primary)");
    root.style.setProperty("--color-surface", "var(--bg-secondary)");
    root.style.setProperty("--color-sidebar", "var(--bg-secondary)");
    root.style.setProperty("--color-header", "var(--bg-secondary)");
    root.style.setProperty("--color-card", "var(--bg-card)");
    root.style.setProperty("--color-border", "var(--border-card)");
    root.style.setProperty("--color-text", "var(--text-main)");
    root.style.setProperty("--color-text-secondary", "var(--text-muted)");
    root.style.setProperty("--color-focus", `color-mix(in srgb, ${hex} 70%, transparent)`);
    root.style.setProperty("--accent-gradient-start", active);
    root.style.setProperty("--accent-gradient-end", gradientEnd);
    root.style.setProperty("--accent-active", active);
    root.style.setProperty("--accent-light", hslToHex(hsl.h, hsl.s, Math.min(94, hsl.l + 24)));
    root.style.setProperty("--accent-dark", hslToHex(hsl.h, hsl.s, Math.max(18, hsl.l - 24)));
    root.style.setProperty("--accent-hover", hslToHex(hsl.h, hsl.s, Math.max(18, hsl.l - (theme === "light-bistro" ? 8 : 10))));
    root.style.setProperty("--accent-secondary", mixHex(hex, hslToHex((hsl.h + 24) % 360, hsl.s, hsl.l), 0.35));
    root.style.setProperty("--accent-gradient-end", hslToHex(hsl.h, hsl.s, Math.max(18, hsl.l - 8)));
    root.style.setProperty("--accent-active-border", `${active}b3`);
    root.style.setProperty("--accent-active-glow", `${hex}59`);
    root.style.setProperty("--accent-rgb", active.match(/[\da-f]{2}/gi).map((part) => parseInt(part, 16)).join(", "));
    root.style.setProperty("--accent-on", contrast);
    root.style.setProperty("--accent-surface", `color-mix(in srgb, ${hex} 14%, var(--bg-secondary))`);
    root.style.setProperty("--accent-surface-hover", `color-mix(in srgb, ${hex} 22%, var(--bg-secondary))`);
    root.style.setProperty("--accent-border", `color-mix(in srgb, ${active} 55%, var(--border-card))`);
  }
  return hex;
}

function relativeLuminance(hex) {
  const channels = hex.match(/[\da-f]{2}/gi).map((part) => parseInt(part, 16) / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function hexToHsl(hex) {
  const [r, g, b] = hex.match(/[\da-f]{2}/gi).map((part) => parseInt(part, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hexToHsv(hex) {
  const hsl = hexToHsl(hex);
  const s = hsl.s / 100;
  const l = hsl.l / 100;
  const v = l + s * Math.min(l, 1 - l);
  const hsvS = v === 0 ? 0 : 2 * (1 - l / v);
  return { h: hsl.h, s: Math.round(hsvS * 100), v: Math.round(v * 100) };
}

export function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
}

export function hsvToHex(h, s, v) {
  s /= 100; v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  const channels = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${channels.map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export function mixHex(hex, other, amount) {
  const a = hex.match(/[\da-f]{2}/gi).map((part) => parseInt(part, 16));
  const b = other.match(/[\da-f]{2}/gi).map((part) => parseInt(part, 16));
  return `#${a.map((channel, index) => Math.round(channel * (1 - amount) + b[index] * amount).toString(16).padStart(2, "0")).join("")}`;
}
