"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme";
import { ExportMenu } from "./export-menu";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Workspace" },
  { href: "/tools", label: "Tools" },
  { href: "/about", label: "About" },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-1 px-2 sm:h-14 sm:gap-6 sm:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="TinyTools home">
          <Image
            src="/site-icon.png"
            alt=""
            width={207}
            height={286}
            className="h-10 w-auto object-contain"
            unoptimized
            priority
          />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">TinyTools</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  active && "bg-accent text-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <ExportMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
