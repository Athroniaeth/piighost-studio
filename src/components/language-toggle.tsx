"use client";

import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/use-t";
import type { Locale } from "@/i18n/types";

const LANGUAGES: { value: Locale; flag: string; label: string }[] = [
  { value: "en", flag: "🇬🇧", label: "English" },
  { value: "fr", flag: "🇫🇷", label: "Français" },
];

export function LanguageToggle() {
  const { locale, setLocale, t } = useT();
  const current = LANGUAGES.find((l) => l.value === locale) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" aria-label={t.nav.toggleLanguage}>
            <span aria-hidden="true">{current.flag}</span>
            <span>{current.label}</span>
            <ChevronDownIcon className="size-4 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => setLocale(value as Locale)}
        >
          {LANGUAGES.map((lang) => (
            <DropdownMenuRadioItem key={lang.value} value={lang.value}>
              <span aria-hidden="true">{lang.flag}</span>
              <span>{lang.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
