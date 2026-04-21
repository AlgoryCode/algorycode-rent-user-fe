import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { firstSearchParam, isCompleteBookingQuery } from "@/lib/reservationGate";
import { fetchFleetVehicleById } from "@/lib/rentFleet";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function RezervasyonFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-5 pt-28 text-text-muted">
      Rezervasyon formu yükleniyor…
    </div>
  );
}

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const arac = firstSearchParam(sp.arac);
  const alis = firstSearchParam(sp.alis);
  const teslim = firstSearchParam(sp.teslim);
  const lokasyon = firstSearchParam(sp.lokasyon);
  const lokasyonTeslim = firstSearchParam(sp.lokasyonTeslim);

  if (!isCompleteBookingQuery({ arac, alis, teslim, lokasyon, lokasyonTeslim })) {
    redirect("/araclar");
  }

  const aracId = arac!.trim();
  const vehicle = await fetchFleetVehicleById(aracId);
  if (!vehicle) {
    redirect("/araclar");
  }

  return (
    <SiteLayout>
      <main>
        <Suspense fallback={<RezervasyonFallback />}>
          <BookingWizard vehicle={vehicle} />
        </Suspense>
      </main>
    </SiteLayout>
  );
}
