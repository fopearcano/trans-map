import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { getLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/client";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return {
    title: { default: "TRANS-MAP", template: "%s · TRANS-MAP" },
    description: t.meta.description,
    applicationName: "TRANS-MAP",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
  ],
};

// Dark theme is the default; a stored user choice wins. Runs before paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('tm-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <body>
        <Script id="tm-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
