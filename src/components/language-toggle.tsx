"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";

export function LanguageToggle() {
  const { locale, setLocale, t } = useT();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t.nav.toggleLanguage}
      onClick={() => setLocale(locale === "en" ? "fr" : "en")}
    >
      {locale === "en" ? "🇫🇷" : "🇬🇧"}
    </Button>
  );
}
