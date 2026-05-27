"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname === `${href}/`;
  return (
    <Button
      variant="ghost"
      size="sm"
      render={<Link href={href} className={cn(active && "text-primary")} />}
    >
      {label}
    </Button>
  );
}
