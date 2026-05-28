export type { Locale, Dictionary, PhilosophyDict } from "./types";
export { en } from "./en";
export { fr } from "./fr";
import { en } from "./en";
import { fr } from "./fr";
import type { Locale } from "./types";

export const dictionaries = { en, fr } as const;
export const defaultLocale = "en" as const satisfies Locale;
