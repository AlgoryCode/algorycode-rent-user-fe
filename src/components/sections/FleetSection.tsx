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
    <section id="filomuz" className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <Reveal>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Filomuz</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          Ekonomiden SUV&apos;ye <span className="text-accent">geniş seçim</span>
        </h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-text-muted sm:text-sm">
          Filtreleyin, fiyatı görün, detayda müsaitlik takvimini inceleyin. Tüm filo tek listede.
        </p>
      </Reveal>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:gap-6">
        {preview.map((car, index) => (
          <Reveal key={car.id} delay={index * 0.06} y={24}>
            <VehicleCard vehicle={car} querySuffix="" />
          </Reveal>
        ))}
      </div>

      <motion.div
        className="mt-8 flex justify-center"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <Link
          href="/araclar"
          className="inline-flex items-center rounded-md border border-accent/40 bg-accent/10 px-5 py-2.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent/15"
        >
          Tüm araçlar ({vehicles.length})
        </Link>
      </motion.div>
    </section>
  );
}
