import type { ReactNode } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";

export default function AraclarLayout({ children }: { children: ReactNode }) {
  return (
    <SiteLayout>
      <main>{children}</main>
    </SiteLayout>
  );
}
