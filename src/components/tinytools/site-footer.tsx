import Image from "next/image";
import { siteConfig } from "@/lib/seo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-5 py-6 sm:justify-end">
        <a
          href={siteConfig.creator.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`Developed by ${siteConfig.creator.name}`}
        >
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase transition-colors group-hover:text-foreground">
            Developed by
          </span>
          {/* Light mode: dark logo. Dark mode: light logo. Transparent PNGs — no chrome behind. */}
          <Image
            src="/ppt_logo_dark.png"
            alt={siteConfig.creator.name}
            width={160}
            height={48}
            className="h-10 w-auto object-contain dark:hidden"
            unoptimized
          />
          <Image
            src="/ppt_logo_light.png"
            alt={siteConfig.creator.name}
            width={160}
            height={48}
            className="hidden h-10 w-auto object-contain dark:block"
            unoptimized
          />
        </a>
      </div>
    </footer>
  );
}
