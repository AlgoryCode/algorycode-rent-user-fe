"use client";

import { usePathname } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { QuestFooter } from "@/components/quest/QuestFooter";
import { QuestMiniChrome } from "@/components/quest/QuestMiniChrome";
import type { ReactNode } from "react";

export function SiteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideFooter = pathname === "/rezervasyon" || pathname.startsWith("/rezervasyon/");

  return (
    <PageShell>
      <div className="relative flex min-h-0 flex-1 flex-col bg-background text-foreground">
        <QuestMiniChrome />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        {!hideFooter ? <QuestFooter /> : null}
      </div>
    </PageShell>
  );
}
