import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeInit } from "@/components/tinytools/theme-init";
import { absoluteUrl, defaultOgImage, siteConfig } from "@/lib/seo";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.creator.name, url: siteConfig.creator.url }],
  creator: siteConfig.creator.name,
  publisher: siteConfig.creator.name,
  category: "technology",
  classification: "Image utilities",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/site-icon.png", type: "image/png" }],
    shortcut: "/site-icon.png",
    apple: [{ url: "/site-icon.png", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [defaultOgImage.url],
    creator: siteConfig.creator.name,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    "msapplication-TileColor": "#0a0a0f",
    copyright: `© ${new Date().getFullYear()} ${siteConfig.creator.name}`,
    "application-name": siteConfig.name,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1b22" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      publisher: { "@id": `${siteConfig.url}/#organization` },
      creator: { "@id": `${siteConfig.url}/#organization` },
      copyrightHolder: { "@id": `${siteConfig.url}/#organization` },
      copyrightNotice: `© ${new Date().getFullYear()} ${siteConfig.creator.name}`,
      inLanguage: "en",
    },
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.creator.name,
      legalName: siteConfig.creator.name,
      url: siteConfig.creator.url,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(siteConfig.creator.logoDark),
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${siteConfig.url}/#app`,
      name: siteConfig.name,
      url: siteConfig.url,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript and a modern browser",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description: siteConfig.description,
      featureList: [
        "Compress images",
        "Convert JPEG PNG AVIF",
        "Resize and crop",
        "Remove background",
        "Watermark images",
        "Strip EXIF metadata",
        "Batch rename",
        "Export to PDF",
      ],
      creator: { "@id": `${siteConfig.url}/#organization` },
      publisher: { "@id": `${siteConfig.url}/#organization` },
      copyrightHolder: { "@id": `${siteConfig.url}/#organization` },
      isAccessibleForFree: true,
    },
    {
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      author: { "@id": `${siteConfig.url}/#organization` },
      creator: { "@id": `${siteConfig.url}/#organization` },
      publisher: { "@id": `${siteConfig.url}/#organization` },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description: siteConfig.description,
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${instrumentSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=JSON.parse(localStorage.getItem("tinytools.prefs.v1")||"{}");if(p.theme==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={instrumentSans.className}>
        <ThemeInit>{children}</ThemeInit>
      </body>
    </html>
  );
}
