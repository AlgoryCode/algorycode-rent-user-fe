import type { FleetVehicle } from "@/data/fleet";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CategoryShowcaseSection } from "@/components/home/CategoryShowcaseSection";
import { FaqContactSection } from "@/components/home/FaqContactSection";
import { FleetSection } from "@/components/sections/FleetSection";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { MotivationSection } from "@/components/sections/MotivationSection";
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

/**
 * Ana sayfa modüler bölümler (yukarıdan aşağıya):
 * 1. Navbar → `SiteLayout` / `Header`
 * 2. Hero → `Hero`
 * 3. Kategori vitrin kartları → `CategoryShowcaseSection`
 * 4. Öne çıkan filo → `FleetSection`
 * 5. Teşvik / CTA → `MotivationSection`
 * 6. Nasıl çalışır → `HowItWorks`
 * 7. SSS + iletişim özeti → `FaqContactSection`
 * 8. Footer → `SiteLayout` / `Footer`
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
        <CategoryShowcaseSection vehicles={vehicles} exploreHref={exploreHref} />
        <FleetSection
          vehicles={vehicles}
          exploreHref={exploreHref}
          vehicleCardQuerySuffix={preserveQs}
          hasAvailabilityQuery={Boolean(availability)}
        />
        <MotivationSection />
        <HowItWorks />
        <FaqContactSection />
      </main>
    </SiteLayout>
  );
}
