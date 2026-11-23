import React, { useState, useEffect } from 'react';
import { Sun, MoonStar } from 'lucide-react';
import { applyTheme, getSavedTheme, normalizeTheme } from '../utils/theme';

export function ThemeToggle({ currentTheme, onChangeTheme }) {
  const [activeTheme, setActiveTheme] = useState(() => {
    return normalizeTheme(
      currentTheme ||
      (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null) ||
      getSavedTheme()
    );
  });

  useEffect(() => {
    if (currentTheme) {
      setActiveTheme(normalizeTheme(currentTheme));
    }
  }, [currentTheme]);

  useEffect(() => {
    const handleThemeChange = (e) => {
      const next = e?.detail || (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null) || getSavedTheme();
      setActiveTheme(normalizeTheme(next));
    };

    window.addEventListener('theme-changed', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  const isLight = activeTheme === 'light-bistro';
  const label = isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme';

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nextTheme = isLight ? 'royal-saffron' : 'light-bistro';
    applyTheme(nextTheme);
    setActiveTheme(nextTheme);
    if (typeof onChangeTheme === 'function') {
      onChangeTheme(nextTheme);
    }
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      title={label}
      aria-label={label}
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {isLight ? <MoonStar size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
      <span className="theme-toggle-label">{isLight ? 'Light' : 'Dark'}</span>
    </button>
  );
}

