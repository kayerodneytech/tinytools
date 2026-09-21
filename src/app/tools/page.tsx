import type { Metadata } from "next";
import Link from "next/link";
import { TopNav } from "@/components/tinytools/top-nav";
import { roadmap, tools } from "@/lib/tinytools/catalog";

export const metadata: Metadata = {
  title: "All tools",
  description:
    "Every TinyTools utility: compress, convert, resize, crop, rotate, watermark, strip metadata, adjust and social export presets.",
  openGraph: {
    title: "All tools — TinyTools",
    description: "Browse the TinyTools utility catalog and what is coming next.",
  },
};

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
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
    </div>
  );
}
