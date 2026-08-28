"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";
import { localePath, stripLocale } from "@/i18n/locale-path";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  label,
  matchSubpaths = false,
}: {
  href: string;
  label: string;
  matchSubpaths?: boolean;
}) {
  const { locale } = useT();
  const pathname = stripLocale(usePathname());
  const active =
    pathname === href ||
    pathname === `${href}/` ||
    (matchSubpaths && pathname.startsWith(`${href}/`));
  return (
    <Button
      variant="ghost"
      size="lg"
      render={<Link href={localePath(locale, href)} className={cn(active && "text-primary")} />}
    >
      {label}
    </Button>
  );
}
