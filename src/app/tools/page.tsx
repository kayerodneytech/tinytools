import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/tinytools/page-shell";
import { roadmap, tools } from "@/lib/tinytools/catalog";
import { absoluteUrl } from "@/lib/seo";

const description =
  "Browse every TinyTools utility: compress images, convert JPEG/PNG/AVIF, resize, crop for social, rotate, remove backgrounds, watermark, strip EXIF, adjust filters, and batch rename — all local in your browser.";

export const metadata: Metadata = {
  title: "All image tools",
  description,
  alternates: { canonical: "/tools" },
  keywords: [
    "image tools list",
    "online image compressor",
    "background remover browser",
    "batch image rename",
    "social media crop presets",
  ],
  openGraph: {
    title: "All image tools — TinyTools",
    description,
    url: absoluteUrl("/tools"),
  },
  twitter: {
    title: "All image tools — TinyTools",
    description,
  },
};

export default function ToolsPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-4xl space-y-10 px-5 py-12">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">All tools</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Available now, running locally in your browser. Every tool works with batches.
          </p>
        </header>

        <div className="grid gap-2 sm:grid-cols-2">
          {tools.map((t) => (
            <Link key={t.id} href="/" className="panel px-4 py-3.5 transition-shadow hover:shadow-lift">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.hint}</p>
            </Link>
          ))}
        </div>

        <section className="space-y-5">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            On the roadmap
          </h2>
          {roadmap.map((group) => (
            <div key={group.group} className="space-y-2">
              <p className="text-sm font-medium">{group.group}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </PageShell>
  );
}
