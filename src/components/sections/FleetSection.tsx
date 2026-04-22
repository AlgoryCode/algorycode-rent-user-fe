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
  gridShowAll = false,
}: {
  vehicles?: FleetVehicle[];
  /** “Tümünü gör” hedefi (örn. `/araclar?alis=…`) */
  exploreHref?: string;
  /** Araç kartı → detay linkine eklenecek sorgu (`alis=…` vb.) */
  vehicleCardQuerySuffix?: string;
  /** URL’de geçerli tarih aralığı varken filo sunucudan yüklendi. */
  hasAvailabilityQuery?: boolean;
  /** Ana sayfa: Index gibi tüm listelenen araçları göster */
  gridShowAll?: boolean;
}) {
  const preview = gridShowAll ? vehicles : vehicles.slice(0, previewCount);

  return (
    <section id="filomuz" className="container mx-auto px-4 py-16 lg:py-24">
      <Reveal>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-primary">Filomuz</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Öne çıkan araçlar</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Her bütçeye ve ihtiyaca uygun, bakımlı ve sigortalı araçlardan dilediğini seç.
            </p>
          </div>
        </div>
      </Reveal>

      {preview.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((car, index) => (
            <Reveal key={car.id} delay={index * 0.06} y={24}>
              <VehicleCard vehicle={car} querySuffix={vehicleCardQuerySuffix} imagePriority={index === 0} />
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="mx-auto mt-10 max-w-lg text-center text-sm leading-relaxed text-muted-foreground">
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
