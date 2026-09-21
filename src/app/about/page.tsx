import type { Metadata } from "next";
import { TopNav } from "@/components/tinytools/top-nav";

export const metadata: Metadata = {
  title: "About TinyTools — local-first file utilities",
  description:
    "TinyTools is a set of fast, private utilities for everyday file and image tasks. Processing happens in your browser, so nothing is uploaded.",
  openGraph: {
    title: "About TinyTools",
    description: "Why TinyTools is local-first, account-free and built for speed.",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
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
    </div>
  );
}
