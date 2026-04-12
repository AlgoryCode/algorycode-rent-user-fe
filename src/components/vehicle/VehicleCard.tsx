"use client";

import Image from "next/image";
import Link from "next/link";
import type { FleetVehicle } from "@/data/fleet";
import { formatTry } from "@/data/fleet";
import { LocationPinIcon } from "@/components/ui/LocationPinIcon";
import { SeatIcon } from "@/components/ui/VehicleSpecIcons";
import { TransmissionBadge } from "@/components/vehicle/TransmissionBadge";

export function VehicleCard({
  vehicle,
  querySuffix = "",
}: {
  vehicle: FleetVehicle;
  /** örn. `alis=...&teslim=...` */
  querySuffix?: string;
}) {
  const href = `/arac/${vehicle.id}${querySuffix ? `?${querySuffix}` : ""}`;

  return (
    <article
      className="group relative overflow-hidden rounded-xl border border-border-subtle bg-bg-card shadow-sm"
    >
      <Link href={href} className="block outline-none ring-accent/30 focus-visible:ring-2">
        <div className="relative aspect-[16/11] overflow-hidden">
          <div className="relative h-full w-full">
            <Image
              src={vehicle.image}
              alt={vehicle.imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-bg-deep/90 via-bg-deep/15 to-transparent opacity-90" />
          {vehicle.badge && (
            <span className="absolute left-3 top-3 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {vehicle.badge}
            </span>
          )}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
            <TransmissionBadge transmission={vehicle.transmission} size="sm" />
            <span className="inline-flex items-center gap-0.5 rounded-md border border-border-subtle bg-bg-card/90 px-2 py-0.5 text-[10px] text-text">
              <SeatIcon className="h-3 w-3 text-text-muted" />
              {vehicle.seats} kişi
            </span>
            <span className="rounded-md border border-border-subtle bg-bg-card/90 px-2 py-0.5 text-[10px] capitalize text-text">
              {vehicle.fuel}
            </span>
          </div>
        </div>
        <div className="relative p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            {vehicle.brand} · {vehicle.category}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug text-text sm:text-lg">{vehicle.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-text-muted">{vehicle.description}</p>
          {vehicle.pickupLocationLabel && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-text-muted">
              <LocationPinIcon className="size-3.5 text-accent" />
              <span className="truncate">{vehicle.pickupLocationLabel}</span>
            </p>
          )}
          <ul className="mt-2 flex flex-wrap gap-1">
            {vehicle.specs.slice(0, 3).map((s) => (
              <li
                key={s}
                className="rounded-md border border-border-subtle bg-bg-raised/50 px-2 py-0.5 text-[10px] text-text-muted"
              >
                {s}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-border-subtle pt-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Günlük</p>
              <p className="text-lg font-semibold text-text sm:text-xl">
                {formatTry(vehicle.pricePerDay)}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
