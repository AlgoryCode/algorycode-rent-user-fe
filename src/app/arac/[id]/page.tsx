import { notFound } from "next/navigation";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { VehicleDetailView } from "@/components/vehicle/VehicleDetailView";
import { fetchFleetVehicleById } from "@/lib/rentFleet";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AracDetayPage({ params, searchParams }: Props) {
  const { id } = await params;

  const vehicle = await fetchFleetVehicleById(id);
  if (!vehicle) notFound();

  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const k of ["alis", "teslim", "lokasyon", "lokasyonTeslim", "ulkeDisi"] as const) {
    const v = sp[k];
    if (typeof v === "string" && v) qs.set(k, v);
  }
  const queryString = qs.toString();

  return (
    <SiteLayout>
      <main>
        <VehicleDetailView vehicle={vehicle} queryString={queryString} />
      </main>
    </SiteLayout>
  );
}
