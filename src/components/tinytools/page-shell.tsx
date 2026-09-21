import type { ReactNode } from "react";
import { TopNav } from "./top-nav";
import { SiteFooter } from "./site-footer";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
