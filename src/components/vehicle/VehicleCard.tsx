"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { FleetVehicle, FuelType } from "@/data/fleet";

function fuelLabel(f: FuelType): string {
  const m: Record<FuelType, string> = {
    benzin: "Benzin",
    dizel: "Dizel",
    hibrit: "Hibrit",
    elektrik: "Elektrik",
  };
  return m[f];
}

export function VehicleCard({
  vehicle,
  querySuffix = "",
}: {
  vehicle: FleetVehicle;
  querySuffix?: string;
  /** Geriye dönük; animasyon kullanılmıyor. */
  revealDelay?: number;
}) {
  const { formatPrice } = useI18n();
  const href = `/arac/${vehicle.id}${querySuffix ? `?${querySuffix}` : ""}`;
  const vites = vehicle.transmission === "otomatik" ? "Otomatik" : "Manuel";
  const specLine = `${vites} · ${fuelLabel(vehicle.fuel)} · ${vehicle.seats} koltuk`;

  return (
    <article className="group">
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-card shadow-md transition-shadow duration-200 hover:shadow-lg">
        <Link
          href={href}
          className="flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg-raised sm:aspect-[16/10]">
            <Image
              src={vehicle.image}
              alt={vehicle.imageAlt}
              fill
              quality={88}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
              className="object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            />
            {vehicle.badge ? (
              <span className="absolute right-3 top-3 rounded-md border border-border-subtle bg-bg-card/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text">
                {vehicle.badge}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{vehicle.brand}</p>
              <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-text sm:text-xl">
                {vehicle.name}
              </h3>
              <p className="mt-1 text-xs text-text-muted">{vehicle.category}</p>
              <p className="mt-2 text-sm font-medium text-text">{specLine}</p>
            </div>

            <div className="mt-auto flex items-end justify-between gap-3 border-t border-border-subtle pt-4">
              <div className="min-w-0 leading-tight">
                <p className="text-xl font-bold tabular-nums text-text sm:text-2xl">
                  <span>{formatPrice(vehicle.pricePerDay)}</span>
                  <span className="text-sm font-semibold text-text-muted"> / gün</span>
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-accent underline-offset-2 transition-colors group-hover:underline">
                Kirala
              </span>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}
