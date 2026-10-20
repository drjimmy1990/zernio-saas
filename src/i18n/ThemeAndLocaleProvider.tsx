'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DICTIONARIES,
  LOCALE_META,
  type SupportedLocale,
  type TranslationDictionary,
} from '@/i18n/dictionaries';

export type ThemeMode = 'light' | 'dark';

interface ThemeAndLocaleContextValue {
  locale: SupportedLocale;
  setLocale: (loc: SupportedLocale) => void;
  dir: 'rtl' | 'ltr';
  theme: ThemeMode;
  toggleTheme: () => void;
  t: TranslationDictionary;
}

const ThemeAndLocaleContext = createContext<ThemeAndLocaleContextValue>({
  locale: 'ar',
  setLocale: () => {},
  dir: 'rtl',
  theme: 'light',
  toggleTheme: () => {},
  t: DICTIONARIES.ar,
});

export function ThemeAndLocaleProvider({
  children,
  fixedLocale,
}: {
  children: React.ReactNode;
  fixedLocale?: SupportedLocale;
}) {
  const [storedLocale, setLocaleState] = useState<SupportedLocale>('ar');
  const locale = fixedLocale ?? storedLocale;
  const [theme, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    const savedLoc = window.localStorage.getItem(
      'asra3_locale'
    ) as SupportedLocale | null;
    if (savedLoc && DICTIONARIES[savedLoc]) {
      setLocaleState(savedLoc);
    }
    const savedTheme = window.localStorage.getItem(
      'asra3_theme'
    ) as ThemeMode | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeState(savedTheme);
    }
  }, []);

  const meta =
    LOCALE_META.find((m) => m.code === locale) || LOCALE_META[0];
  const dir = meta.dir;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.documentElement.dataset.theme = theme;
  }, [locale, dir, theme]);

  const setLocale = (loc: SupportedLocale) => {
    setLocaleState(loc);
    window.localStorage.setItem('asra3_locale', loc);
  };

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setThemeState(next);
    window.localStorage.setItem('asra3_theme', next);
  };

  const t = DICTIONARIES[locale] || DICTIONARIES.ar;

  return (
    <ThemeAndLocaleContext.Provider
      value={{ locale, setLocale, dir, theme, toggleTheme, t }}
    >
      <div
        dir={dir}
        className={
          locale === 'ar' ? 'font-arabic min-h-screen' : 'font-sans min-h-screen'
        }
      >
        {children}
      </div>
    </ThemeAndLocaleContext.Provider>
  );
}

export function useThemeAndLocale() {
  return useContext(ThemeAndLocaleContext);
}
