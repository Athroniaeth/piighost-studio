"use client";

import { createContext, type ReactNode } from "react";
import { dictionaries, defaultLocale } from "./index";
import type { Locale, Dictionary } from "./types";

export type LanguageContextValue = {
  locale: Locale;
  t: Dictionary;
};

export const LanguageContext = createContext<LanguageContextValue>({
  locale: defaultLocale,
  t: dictionaries[defaultLocale],
});

export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LanguageContext.Provider value={{ locale, t: dictionaries[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}
