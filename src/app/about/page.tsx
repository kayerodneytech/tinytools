import type { Metadata } from "next";
import { PageShell } from "@/components/tinytools/page-shell";
import { absoluteUrl, siteConfig } from "@/lib/seo";

const description =
  "TinyTools is a free, local-first set of image utilities from PixelPyre Technologies. Compress, convert, resize, crop, and clean up images in your browser — no account, no uploads, built for speed.";

export const metadata: Metadata = {
  title: "About TinyTools",
  description,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About TinyTools — local-first file utilities",
    description,
    url: absoluteUrl("/about"),
  },
  twitter: {
    title: "About TinyTools — local-first file utilities",
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
            Image processing happens locally with the browser&apos;s own canvas and codec pipeline.
            Your files never touch a server, which makes it faster, private, and workable on flaky
            connections. Only future AI tools will need server help.
          </p>
          <p>
            Your last-used format, quality and resize settings are remembered on this device, so
            repeat work takes a single click.
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
            ["Local", "Nothing uploaded"],
            ["Batch", "Drop 100 files"],
            ["Instant", "Live preview, no apply button"],
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
