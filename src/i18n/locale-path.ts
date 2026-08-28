import type { Locale } from "./types";

const LOCALES = ["en", "fr"] as const;

/** Build a locale-prefixed, trailing-slashed href from a base app path. */
export function localePath(locale: Locale, path: string): string {
  const [rawPath, query] = path.split("?");
  const clean = rawPath.replace(/^\/+|\/+$/g, ""); // trim slashes
  const base = clean ? `/${locale}/${clean}/` : `/${locale}/`;
  return query ? `${base}?${query}` : base;
}

/** Remove a leading /en or /fr segment, returning a normalized app path. */
export function stripLocale(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length && (LOCALES as readonly string[]).includes(parts[0])) {
    parts.shift();
  }
  return parts.length ? `/${parts.join("/")}` : "/";
}

/** Replace the leading locale segment with `target`, preserving the path. */
export function swapLocale(pathname: string, target: Locale): string {
  return localePath(target, stripLocale(pathname));
}
