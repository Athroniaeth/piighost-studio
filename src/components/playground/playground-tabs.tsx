"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

/** Tab bar that switches between the two playground surfaces:
 *  Pipeline (/playground) and Detector (/playground/detector). Rendered at the top
 *  of both views so each can navigate to the other. */
export function PlaygroundTabs() {
  const { t } = useT();
  const pathname = usePathname();
  const onDetector = pathname.startsWith("/playground/detector");
  const tabs = [
    { href: "/playground", label: t.playground.tabPipeline, active: !onDetector },
    { href: "/playground/detector", label: t.playground.tabDetector, active: onDetector },
  ];

  return (
    <nav className="mb-3 flex shrink-0 gap-1 self-start rounded-lg border bg-muted/40 p-1 text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            tab.active
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
