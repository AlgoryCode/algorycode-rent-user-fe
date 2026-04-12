import { Suspense } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { AraclarExplore } from "@/components/araclar/AraclarExplore";
import { fetchUnifiedFleet } from "@/lib/rentFleet";

function AraclarFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-5 pt-28 text-text-muted">
      Arama yükleniyor…
    </div>
  );
}

export default async function AraclarPage() {
  const vehicles = await fetchUnifiedFleet();

  return (
    <SiteLayout>
      <main>
        <Suspense fallback={<AraclarFallback />}>
          <AraclarExplore vehicles={vehicles} />
        </Suspense>
      </main>
    </SiteLayout>
  );
}
