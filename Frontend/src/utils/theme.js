export const THEME_STORAGE_KEY = 'gourmet_pos_theme_v2';
export const normalizeTheme = (value) => value === 'royal-saffron' || value === 'dark' ? 'royal-saffron' : 'light-bistro';
export function getSavedTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'light-bistro';
  }
}
export function applyTheme(value) {
  const theme = normalizeTheme(value);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'light-bistro' ? 'light' : 'dark';
    if (document.body) {
      document.body.setAttribute('data-theme', theme);
    }
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }));
    window.dispatchEvent(new Event('storage'));
  }
}

