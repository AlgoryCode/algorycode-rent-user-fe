"use client";

import { PageShell } from "@/components/PageShell";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import type { ReactNode } from "react";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <PageShell>
      <div className="theme-canvas noise text-text flex min-h-full flex-col">
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </div>
    </PageShell>
  );
}
