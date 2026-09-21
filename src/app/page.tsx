import type { Metadata } from "next";
import { TopNav } from "@/components/tinytools/top-nav";
import { Workspace } from "@/components/tinytools/workspace";

export const metadata: Metadata = {
  title: "TinyTools — Compress, convert & resize images in seconds",
  description:
    "Drop a file, click, download. Fast browser-based tools for compressing, converting, resizing and cleaning up images. No account, no uploads.",
  openGraph: {
    title: "TinyTools — file & image tasks in seconds",
    description:
      "Lightweight local-first utilities for compressing, converting and resizing images. Nothing leaves your device.",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main>
        <Workspace />
      </main>
    </div>
  );
}
