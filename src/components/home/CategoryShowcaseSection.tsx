"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import type { FleetVehicle } from "@/data/fleet";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { Reveal } from "@/components/ui/Reveal";

function categoryHref(exploreHref: string, category: string) {
  const sep = exploreHref.includes("?") ? "&" : "?";
  return `${exploreHref}${sep}kategori=${encodeURIComponent(category)}`;
}

export function CategoryShowcaseSection({
  vehicles,
  exploreHref,
}: {
  vehicles: FleetVehicle[];
  exploreHref: string;
}) {
  const { t } = useI18n();

  const items = useMemo(() => {
    const map = new Map<string, FleetVehicle>();
    for (const v of vehicles) {
      const c = (v.category || "Diğer").trim() || "Diğer";
      if (!map.has(c)) map.set(c, v);
    }
    const fromFleet = Array.from(map.entries()).map(([label, v]) => ({
      label,
      image: v.image,
      imageAlt: v.imageAlt || `${v.brand} ${v.name}`,
      href: categoryHref(exploreHref, label),
    }));
    if (fromFleet.length > 0) return fromFleet.slice(0, 6);
    const demo =
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=70";
    return [
      { label: "SUV", image: demo, imageAlt: "SUV", href: exploreHref },
      { label: "Sedan", image: demo, imageAlt: "Sedan", href: exploreHref },
      { label: "Ekonomi", image: demo, imageAlt: "Ekonomi", href: exploreHref },
    ];
  }, [vehicles, exploreHref]);

  return (
    <section
      id="kategoriler"
      className="relative border-b border-border-subtle bg-bg-raised/35 py-14 sm:py-16 dark:bg-bg-raised/15"
      aria-labelledby="home-category-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            {t("home.categorySection.kicker")}
          </p>
          <h2
            id="home-category-heading"
            className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-3xl"
          >
            {t("home.categorySection.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
            {t("home.categorySection.subtitle")}
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <Reveal key={item.label} delay={index * 0.06} y={20}>
              <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 380, damping: 26 }}>
                <Link
                  href={item.href}
                  className="group relative block aspect-[16/10] w-full overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm ring-1 ring-black/[0.03] transition-[border-color,box-shadow] hover:border-accent/35 hover:shadow-md dark:border-white/10 dark:bg-bg-card dark:ring-white/[0.05]"
                >
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <p className="text-lg font-semibold tracking-tight text-white drop-shadow-sm sm:text-xl">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs font-medium text-white/85">{t("home.categorySection.cta")}</p>
                  </div>
                </Link>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
