export const THEME_STORAGE_KEY = 'gourmet_pos_theme_v2';
export const normalizeTheme = (value) => value === 'light-bistro' || value === 'light' ? 'light-bistro' : 'royal-saffron';
export function getSavedTheme() { try { return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY)); } catch { return 'royal-saffron'; } }
export function applyTheme(value) { const theme = normalizeTheme(value); document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme === 'light-bistro' ? 'light' : 'dark'; try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {} }
