import { notFound } from "next/navigation";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { fleet } from "@/data/fleet";
import { VehicleDetailView } from "@/components/vehicle/VehicleDetailView";
import { fetchUnifiedFleet } from "@/lib/rentFleet";

export function generateStaticParams() {
  return fleet.map((v) => ({ id: v.id }));
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AracDetayPage({ params, searchParams }: Props) {
  const { id } = await params;
  const vehicles = await fetchUnifiedFleet();
  const vehicle = vehicles.find((v) => v.id === id);
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
