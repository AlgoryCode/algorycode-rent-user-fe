"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { FleetVehicle } from "@/data/fleet";
import { Reveal } from "@/components/ui/Reveal";
import { VehicleCard } from "@/components/vehicle/VehicleCard";

const previewCount = 4;

export function FleetSection({ vehicles = [] }: { vehicles?: FleetVehicle[] }) {
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

      <div className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-4">
        {preview.map((car, index) => (
          <Reveal key={car.id} delay={index * 0.06} y={24}>
            <VehicleCard vehicle={car} querySuffix="" />
          </Reveal>
        ))}
      </div>

      <motion.div
        className="mt-10 flex justify-center"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <Link
          href="/araclar"
          className="inline-flex min-h-11 items-center rounded-md border border-border-subtle bg-bg-card px-6 text-[13px] font-semibold text-text shadow-sm transition-colors hover:border-navy-hero/25 hover:bg-bg-raised"
        >
          Tümünü gör ({vehicles.length})
        </Link>
      </motion.div>
    </section>
  );
}
