"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import { dictionaries, defaultLocale } from "./index";
import type { Locale, Dictionary } from "./types";

const STORAGE_KEY = "piighost.locale";

export type LanguageContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Dictionary;
};

export const LanguageContext = createContext<LanguageContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  t: dictionaries[defaultLocale],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && (stored === "en" || stored === "fr")) {
        setLocaleState(stored);
      }
    } catch {
      // SSR or storage unavailable — stay with default
    }
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable — ignore
    }
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: dictionaries[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}
