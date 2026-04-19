import { SiteLayout } from "@/components/layout/SiteLayout";
import { CtaBand } from "@/components/sections/CtaBand";
import { FleetSection } from "@/components/sections/FleetSection";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { StatsStrip } from "@/components/sections/StatsStrip";
import {
  buildAraclarPreserveQuery,
  flattenSearchParams,
  parseFleetAvailabilityFromFlatParams,
} from "@/lib/fleetAvailabilityQuery";
import { fetchHeroHandoverOptions } from "@/lib/handoverLocations";
import { fetchUnifiedFleet } from "@/lib/rentFleet";

/** URL sorgusu ile filo; statik önbellek `searchParams`’ı yok sayar — Araç Bul sonrası liste güncellenir. */
export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: Props) {
  const raw = searchParams != null ? await searchParams : {};
  const flat = flattenSearchParams(raw);
  const availability = parseFleetAvailabilityFromFlatParams(flat);
  const [vehicles, pickupHandoverOptions, returnHandoverOptions] = await Promise.all([
    fetchUnifiedFleet(availability),
    fetchHeroHandoverOptions("PICKUP"),
    fetchHeroHandoverOptions("RETURN"),
  ]);
  const preserveQs = buildAraclarPreserveQuery(flat);
  const exploreHref = preserveQs ? `/araclar?${preserveQs}` : "/araclar";

  return (
    <SiteLayout>
      <main>
        <Hero pickupHandoverOptions={pickupHandoverOptions} returnHandoverOptions={returnHandoverOptions} />
        <StatsStrip />
        <FleetSection
          vehicles={vehicles}
          exploreHref={exploreHref}
          vehicleCardQuerySuffix={preserveQs}
        />
        <HowItWorks />
        <CtaBand />
      </main>
    </SiteLayout>
  );
}
