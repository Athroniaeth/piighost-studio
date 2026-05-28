import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/i18n/language-provider";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { SmoothSnap } from "@/components/smooth-snap";
import { BackToTop } from "@/components/back-to-top";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://piighost.dev"),
  title: { default: "piighost - anonymize PII before it reaches the LLM", template: "%s - piighost" },
  description:
    "piighost is a Python library for building PII anonymization pipelines. Detect PII with regex, NER, or an LLM, swap it for stable placeholders, and restore real values for your tools.",
  openGraph: {
    title: "piighost",
    description: "Anonymize PII before it reaches the LLM.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LanguageProvider>
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
