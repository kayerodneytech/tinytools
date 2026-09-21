import type { Metadata } from "next";
import { PageShell } from "@/components/tinytools/page-shell";
import { Workspace } from "@/components/tinytools/workspace";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} — ${siteConfig.tagline}` },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: absoluteUrl("/"),
  },
  twitter: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
};

export default function HomePage() {
  return (
    <PageShell>
      <main>
        <Workspace />
      </main>
    </PageShell>
  );
}
