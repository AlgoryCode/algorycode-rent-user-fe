import type { FleetVehicle } from "@/data/fleet";
import { AraclarExplore } from "@/components/araclar/AraclarExplore";
import { flattenSearchParams, parseFleetAvailabilityFromFlatParams } from "@/lib/fleetAvailabilityQuery";
import { fetchHeroHandoverOptions } from "@/lib/handoverLocations";
import { fetchUnifiedFleet } from "@/lib/rentFleet";
import { redirect } from "next/navigation";

/** Tarih/konum sorgusu ve rent API ile kişiselleştirilmiş liste; `rentFleet` + handover sunucu çağrıları dinamik. */
export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AraclarPage({ searchParams }: Props) {
  const raw = searchParams != null ? await searchParams : {};
  const flat = flattenSearchParams(raw);
  const availability = parseFleetAvailabilityFromFlatParams(flat);
  /** Liste yalnızca geçerli kiralama penceresi (alis/teslim + API uygunluk) ile açılır; yoksa ana sayfada arama yapılır. */
  if (!availability) {
    redirect("/");
  }
  const [vehicles, pickupHandoverOptions, returnHandoverOptions] = await Promise.all([
    fetchUnifiedFleet(availability),
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
