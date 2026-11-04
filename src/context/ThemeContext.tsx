import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = 'jarvis_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'dark';
  });

  const applyThemeToDOM = useCallback((mode: ThemeMode) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.classList.remove('theme-dark', 'theme-light', 'dark', 'light');
    root.classList.add(`theme-${mode}`, mode);
    if (document.body) {
      document.body.setAttribute('data-theme', mode);
      document.body.classList.remove('theme-dark', 'theme-light');
      document.body.classList.add(`theme-${mode}`);
    }
  }, []);

  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme, applyThemeToDOM]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Global keyboard shortcut: press 't' or 'T' outside inputs to toggle Lighter/Dark theme
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if ((e.key === 't' || e.key === 'T') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        toggleTheme();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
