import { Suspense } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { AraclarExplore } from "@/components/araclar/AraclarExplore";
import { flattenSearchParams, parseFleetAvailabilityFromFlatParams } from "@/lib/fleetAvailabilityQuery";
import { fetchHeroHandoverOptions } from "@/lib/handoverLocations";
import { fetchUnifiedFleet } from "@/lib/rentFleet";

export const dynamic = "force-dynamic";

function AraclarFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-5 pt-28 text-text-muted">
      Arama yükleniyor…
    </div>
  );
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AraclarPage({ searchParams }: Props) {
  const raw = searchParams != null ? await searchParams : {};
  const flat = flattenSearchParams(raw);
  const availability = parseFleetAvailabilityFromFlatParams(flat);
  const [vehicles, pickupHandoverOptions, returnHandoverOptions] = await Promise.all([
    fetchUnifiedFleet(availability),
    fetchHeroHandoverOptions("PICKUP"),
    fetchHeroHandoverOptions("RETURN"),
  ]);

  return (
    <SiteLayout>
      <main>
        <Suspense fallback={<AraclarFallback />}>
          <AraclarExplore
            vehicles={vehicles}
            pickupHandoverOptions={pickupHandoverOptions}
            returnHandoverOptions={returnHandoverOptions}
          />
        </Suspense>
      </main>
    </SiteLayout>
  );
}
