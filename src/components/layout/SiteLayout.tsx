"use client";

import { usePathname } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import type { ReactNode } from "react";

export function SiteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideFooter = pathname === "/rezervasyon" || pathname.startsWith("/rezervasyon/");

  return (
    <PageShell>
      <div className="theme-canvas theme-canvas-aura text-text relative flex min-h-0 flex-1 flex-col">
        <div className="aura-layer" aria-hidden />
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
          <Header />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          {!hideFooter ? <Footer /> : null}
        </div>
      </div>
    </PageShell>
  );
}
