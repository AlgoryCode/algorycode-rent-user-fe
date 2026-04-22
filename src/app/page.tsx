import type { FleetVehicle } from "@/data/fleet";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { QuestAdvantages } from "@/components/quest/QuestAdvantages";
import { QuestCampaigns } from "@/components/quest/QuestCampaigns";
import { QuestFaq } from "@/components/quest/QuestFaq";
import { QuestNewsletter } from "@/components/quest/QuestNewsletter";
import { FleetSection } from "@/components/sections/FleetSection";
import { Hero } from "@/components/sections/Hero";
import {
  buildAraclarPreserveQuery,
  flattenSearchParams,
  parseFleetAvailabilityFromFlatParams,
} from "@/lib/fleetAvailabilityQuery";
import { fetchHeroHandoverOptions } from "@/lib/handoverLocations";
import { fetchUnifiedFleet } from "@/lib/rentFleet";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Ana sayfa — rent-wheel-quest `Index.tsx` ile aynı blok sırası:
 * Hero → filo gridi → Kampanyalar → Avantajlar → SSS → Bülten → (Footer SiteLayout)
 */
export default async function Home({ searchParams }: Props) {
  const raw = searchParams != null ? await searchParams : {};
  const flat = flattenSearchParams(raw);
  const availability = parseFleetAvailabilityFromFlatParams(flat);
  const [vehicles, pickupHandoverOptions, returnHandoverOptions] = await Promise.all([
    availability ? fetchUnifiedFleet(availability) : Promise.resolve([] as FleetVehicle[]),
    fetchHeroHandoverOptions("PICKUP"),
    fetchHeroHandoverOptions("RETURN"),
  ]);
  const preserveQs = buildAraclarPreserveQuery(flat);
  const exploreHref = preserveQs ? `/araclar?${preserveQs}` : "/araclar";

  return (
    <SiteLayout>
      <main className="flex min-w-0 flex-col">
        <Hero pickupHandoverOptions={pickupHandoverOptions} returnHandoverOptions={returnHandoverOptions} />
        <FleetSection
          vehicles={vehicles}
          exploreHref={exploreHref}
          vehicleCardQuerySuffix={preserveQs}
          hasAvailabilityQuery={Boolean(availability)}
          gridShowAll
        />
        <QuestCampaigns exploreHref={exploreHref} />
        <QuestAdvantages />
        <QuestFaq />
        <QuestNewsletter />
      </main>
    </SiteLayout>
  );
}
