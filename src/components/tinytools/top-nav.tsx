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
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/site-icon.png"
            alt=""
            width={24}
            height={24}
            className="size-6 rounded-md object-cover"
            unoptimized
            priority
          />
          <span className="text-sm font-semibold tracking-tight">TinyTools</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
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
        <div className="ml-auto flex items-center gap-2">
          <ExportMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
