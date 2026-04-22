"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Fuel,
  Settings,
  Snowflake,
  Star,
  Users,
} from "lucide-react";
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

function badgeTokens(badge: string | undefined): string[] {
  if (!badge?.trim()) return [];
  return badge
    .split(/[,|]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasKlimaHint(vehicle: FleetVehicle): boolean {
  const h = vehicle.highlights.some((x) => /klima|klim/i.test(x));
  const inc = vehicle.included.some((x) => /klima|klim/i.test(x));
  const spec = vehicle.specs.some((x) => /klima|klim|AC|A\/C/i.test(x));
  return h || inc || spec;
}

export function VehicleCard({
  vehicle,
  querySuffix = "",
  imagePriority = false,
  /** `araclar`: geniş ekranda görsel solda yatay şerit; dar ekranda klasik dikey kart */
  layout = "vertical",
}: {
  vehicle: FleetVehicle;
  querySuffix?: string;
  revealDelay?: number;
  imagePriority?: boolean;
  layout?: "vertical" | "responsive";
}) {
  const { formatPrice } = useI18n();
  const rowOnWide = layout === "responsive";
  const href = `/arac/${vehicle.id}${querySuffix ? `?${querySuffix}` : ""}`;
  const vites = vehicle.transmission === "otomatik" ? "Otomatik" : "Manuel";

  const specs = [
    { Icon: Settings, label: vites },
    { Icon: Fuel, label: fuelLabel(vehicle.fuel) },
    { Icon: Users, label: `${vehicle.seats} Kişi` },
    { Icon: Briefcase, label: `${vehicle.luggage} Bagaj` },
  ] as const;

  const badges = badgeTokens(vehicle.badge);
  const showKlima = hasKlimaHint(vehicle);

  const priceLine = (
    <div className="flex items-baseline gap-1 shrink-0">
      <span className="text-xl font-extrabold tabular-nums text-foreground sm:text-2xl">
        {formatPrice(vehicle.pricePerDay)}
      </span>
      <span className="text-xs text-muted-foreground">/gün</span>
    </div>
  );

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-500 ease-smooth hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] ${
        rowOnWide ? "lg:flex-row lg:items-stretch" : ""
      }`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className={`relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-gradient-to-br from-muted/40 to-muted/10 ${
          rowOnWide ? "lg:aspect-auto lg:min-h-[12rem] lg:w-48 lg:self-stretch xl:w-52 2xl:w-56" : ""
        }`}
      >
        {badges.length > 0 ? (
          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 sm:left-4 sm:top-4 sm:gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground sm:px-3 sm:text-xs"
              >
                {b}
              </span>
            ))}
          </div>
        ) : null}
        <Image
          src={vehicle.image}
          alt={vehicle.imageAlt}
          fill
          quality={88}
          priority={imagePriority}
          sizes={
            rowOnWide
              ? "(max-width: 1023px) 100vw, (max-width: 1280px) 240px, 280px"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
          }
          className={`object-contain p-3 transition-transform duration-700 ease-smooth group-hover:scale-105 sm:p-4 ${
            rowOnWide ? "lg:p-3 xl:p-4" : ""
          }`}
        />
      </div>

      <div
        className={`flex min-w-0 flex-1 flex-col p-4 sm:p-5 ${rowOnWide ? "lg:justify-between lg:py-4 lg:pl-5 lg:pr-5" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{vehicle.category}</p>
            <h3 className="mt-1 truncate text-lg font-bold text-foreground sm:text-xl">{vehicle.name}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden />
            <span className="text-sm font-bold text-foreground">4.9</span>
          </div>
        </div>

        {rowOnWide ? (
          <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:gap-4 lg:mt-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <ul className="grid min-w-0 grid-cols-2 gap-2 sm:gap-2.5 lg:flex lg:min-w-0 lg:flex-1 lg:flex-nowrap lg:items-center lg:gap-x-3 xl:gap-x-4">
              {specs.map(({ Icon, label }) => (
                <li
                  key={label}
                  className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground lg:shrink-0"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="truncate lg:whitespace-nowrap">{label}</span>
                </li>
              ))}
            </ul>
            <div className="hidden shrink-0 lg:block">{priceLine}</div>
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-2.5">
            {specs.map(({ Icon, label }) => (
              <li key={label} className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="truncate">{label}</span>
              </li>
            ))}
          </ul>
        )}

        {showKlima ? (
          <div
            className={`mt-2 flex items-center gap-1.5 text-xs text-muted-foreground ${rowOnWide ? "lg:mt-2" : ""}`}
          >
            <Snowflake className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span>Klima dahil</span>
          </div>
        ) : null}

        <div
          className={`mt-4 flex items-end justify-between gap-3 border-t border-border/60 pt-4 sm:mt-5 sm:pt-5 ${
            rowOnWide ? "lg:mt-3 lg:justify-end lg:pt-4" : ""
          }`}
        >
          <div className={rowOnWide ? "lg:hidden" : ""}>{priceLine}</div>
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[hsl(var(--sh-primary-glow))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-4"
          >
            İncele
            <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
