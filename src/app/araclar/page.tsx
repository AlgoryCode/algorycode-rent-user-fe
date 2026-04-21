import type { FleetVehicle } from "@/data/fleet";
import { AraclarExplore } from "@/components/araclar/AraclarExplore";
import { flattenSearchParams, parseFleetAvailabilityFromFlatParams } from "@/lib/fleetAvailabilityQuery";
import { fetchHeroHandoverOptions } from "@/lib/handoverLocations";
import { fetchUnifiedFleet } from "@/lib/rentFleet";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AraclarPage({ searchParams }: Props) {
  const raw = searchParams != null ? await searchParams : {};
  const flat = flattenSearchParams(raw);
  const availability = parseFleetAvailabilityFromFlatParams(flat);
  const [vehicles, pickupHandoverOptions, returnHandoverOptions] = await Promise.all([
    availability ? fetchUnifiedFleet(availability) : Promise.resolve([] as FleetVehicle[]),
    fetchHeroHandoverOptions("PICKUP"),
    fetchHeroHandoverOptions("RETURN"),
  ]);

  return (
    <AraclarExplore
      vehicles={vehicles}
      pickupHandoverOptions={pickupHandoverOptions}
      returnHandoverOptions={returnHandoverOptions}
    />
  );
}
