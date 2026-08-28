"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/use-t";
import { swapLocale } from "@/i18n/locale-path";
import type { Locale } from "@/i18n/types";

const LANGUAGES: { value: Locale; flag: string; label: string }[] = [
  { value: "en", flag: "🇬🇧", label: "English" },
  { value: "fr", flag: "🇫🇷", label: "Français" },
];

export function LanguageToggle() {
  const { locale, t } = useT();
  const pathname = usePathname();
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
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.value}
            render={<Link href={swapLocale(pathname, lang.value)} />}
          >
            <span aria-hidden="true">{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
