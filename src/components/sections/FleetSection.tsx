"use client";

import type { FleetVehicle } from "@/data/fleet";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Reveal } from "@/components/ui/Reveal";
import { VehicleCard } from "@/components/vehicle/VehicleCard";

const previewCount = 4;

export function FleetSection({
  vehicles = [],
  exploreHref = "/araclar",
  vehicleCardQuerySuffix = "",
  hasAvailabilityQuery = false,
}: {
  vehicles?: FleetVehicle[];
  /** “Tümünü gör” hedefi (örn. `/araclar?alis=…`) */
  exploreHref?: string;
  /** Araç kartı → detay linkine eklenecek sorgu (`alis=…` vb.) */
  vehicleCardQuerySuffix?: string;
  /** URL’de geçerli tarih aralığı varken filo sunucudan yüklendi. */
  hasAvailabilityQuery?: boolean;
}) {
  const preview = vehicles.slice(0, previewCount);

  return (
    <section id="filomuz" className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <Reveal>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">Öne çıkan filo</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          Seçilmiş araçlar, net günlük fiyat
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
          Listede özet; detayda yalnızca ihtiyaç duyacağınız bilgiler.
        </p>
      </Reveal>

      {preview.length > 0 ? (
        <div className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-4">
          {preview.map((car, index) => (
            <Reveal key={car.id} delay={index * 0.06} y={24}>
              <VehicleCard vehicle={car} querySuffix={vehicleCardQuerySuffix} />
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="mx-auto mt-10 max-w-lg text-center text-sm leading-relaxed text-text-muted">
          {hasAvailabilityQuery
            ? "Bu tarih aralığı için öne çıkan araç bulunamadı. Tarihleri değiştirip tekrar deneyebilir veya tüm listeyi açabilirsiniz."
            : "Üstteki formdan alış ve teslim tarihlerini seçip «Araç Bul» ile arama yaptığınızda, uygun araçlar burada özetlenir."}
        </p>
      )}

      <div className="mt-10 flex justify-center">
        <AnimatedButton variant="ghost" href={exploreHref}>
          {vehicles.length > 0 ? `Tümünü gör (${vehicles.length})` : "Araç listesine git"}
        </AnimatedButton>
      </div>
    </section>
  );
}
