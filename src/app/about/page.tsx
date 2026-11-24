import type { Metadata } from "next";
import { PageShell } from "@/components/tinytools/page-shell";
import { absoluteUrl, siteConfig } from "@/lib/seo";

const description =
  "TinyTools makes it quick and easy to compress, convert, resize, crop, and clean up images.";

export const metadata: Metadata = {
  title: "About TinyTools",
  description,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About TinyTools — quick and simple image tools",
    description,
    url: absoluteUrl("/about"),
  },
  twitter: {
    title: "About TinyTools — quick and simple image tools",
    description,
  },
};

export default function AboutPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-2xl space-y-8 px-5 py-14">
        <h1 className="text-2xl font-semibold tracking-tight">About TinyTools</h1>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            TinyTools exists for one reason: finishing small file jobs fast. Open it, drop a file,
            click once, download, get back to work. No account, no projects, no tutorials.
          </p>
          <p>
            Everything is designed to stay simple: choose your images, pick a tool, and save the
            result. There are no accounts, setup steps, or complicated menus.
          </p>
          <p>
            Your recent choices are remembered, so repeat work takes fewer clicks.
          </p>
          <p>
            Built by{" "}
            <a
              href={siteConfig.creator.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {siteConfig.creator.name}
            </a>
            .
          </p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          {[
            ["Simple", "No account or setup"],
            ["Flexible", "Use one image or many"],
            ["Quick", "See changes as you work"],
          ].map(([k, v]) => (
            <div key={k} className="panel px-4 py-3">
              <dt className="text-sm font-medium">{k}</dt>
              <dd className="mt-0.5 text-xs text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </main>
    </PageShell>
  );
}
