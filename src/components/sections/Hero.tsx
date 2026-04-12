"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  return (
    <section className="border-b border-border-subtle pt-14 sm:pt-[3.75rem]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
          <motion.div
            className="flex max-w-xl flex-col justify-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Araç kiralama · İstanbul
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-text sm:text-4xl">
              Tarih seçin,{" "}
              <span className="text-accent">aracı hemen</span> görün
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-text-muted sm:text-[15px]">
              Günlük net fiyat, müsaitlik takvimi ve havalimanı / ofis teslim seçenekleri — ek
              ücret sürprizlerine karşı sade akış.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <AnimatedButton variant="primary" href="/araclar">
                Araçları listele
              </AnimatedButton>
              <AnimatedButton variant="outline" href="/#nasil">
                Nasıl çalışır
              </AnimatedButton>
            </div>
          </motion.div>

          <motion.div
            className="relative w-full shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-bg-raised lg:max-w-md"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06, ease }}
          >
            <div className="relative aspect-[5/3] w-full sm:aspect-[16/10]">
              <Image
                src="https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=900&q=80"
                alt="Kiralık araç teslimi"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 400px"
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border-subtle bg-bg-card/80 px-4 py-3 text-[12px]">
              <div>
                <p className="font-medium text-text">Havalimanı teslim</p>
                <p className="text-text-muted">IST / SAW noktaları</p>
              </div>
              <span className="rounded-md bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">
                Anında fiyat
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
