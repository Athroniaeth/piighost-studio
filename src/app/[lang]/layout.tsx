import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/i18n/language-provider";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { SmoothSnap } from "@/components/smooth-snap";
import { BackToTop } from "@/components/back-to-top";
import { dictionaries } from "@/i18n";
import type { Locale } from "@/i18n/types";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

function toLocale(raw: string): Locale {
  return raw === "fr" ? "fr" : "en";
}

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "fr" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = toLocale(raw);
  const t = dictionaries[lang];
  return {
    metadataBase: new URL("https://piighost.dev"),
    title: { default: t.seo.defaultTitle, template: `%s - piighost` },
    description: t.seo.defaultDescription,
    alternates: {
      canonical: `/${lang}`,
      languages: { en: "/en", fr: "/fr", "x-default": "/en" },
    },
    openGraph: {
      title: "piighost",
      description: t.seo.defaultDescription,
      type: "website",
      url: `/${lang}`,
      siteName: "piighost",
      locale: lang === "fr" ? "fr_FR" : "en_US",
    },
    twitter: { card: "summary_large_image", title: "piighost", description: t.seo.defaultDescription },
    robots: { index: true, follow: true },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = toLocale(raw);
  return (
    <html lang={lang} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LanguageProvider locale={lang}>
            <SmoothSnap />
            <div className="flex min-h-dvh flex-col">
              <SiteNavbar />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
            <BackToTop />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
