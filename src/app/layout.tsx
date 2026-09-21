import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeInit } from "@/components/tinytools/theme-init";

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
  title: {
    default: "TinyTools",
    template: "%s — TinyTools",
  },
  description: "Fast, private utilities for everyday file and image tasks.",
  openGraph: {
    type: "website",
    title: "TinyTools",
    description: "Fast, private utilities for everyday file and image tasks.",
  },
  twitter: {
    card: "summary_large_image",
  },
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
      </head>
      <body className={instrumentSans.className}>
        <ThemeInit>{children}</ThemeInit>
      </body>
    </html>
  );
}
