"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  return (
    <section className="relative border-b border-border-subtle bg-bg-raised pt-[var(--header-h)] lg:min-h-[28rem]">
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:pb-20">
        <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-2xl lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
              Kurumsal araç kiralama
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-[1.15] tracking-tight text-text sm:text-4xl lg:text-[2.75rem]">
              Şeffaf fiyat, seçili filo, hızlı rezervasyon
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-text-muted sm:text-[15px] lg:mx-0">
              Tarih ve lokasyonu seçin; uygun araçları tek ekranda görün. Gizli ücret yok, özet bilgiyle ilerleyin.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <AnimatedButton variant="primary" href="/araclar" className="min-h-11 px-7">
                Araçlara göz at
              </AnimatedButton>
              <AnimatedButton variant="ghost" href="/#nasil" className="min-h-11 border-border-subtle/90">
                Nasıl çalışır
              </AnimatedButton>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] font-medium text-text-muted lg:justify-start">
              <span>Onaylı filo</span>
              <span className="hidden sm:inline" aria-hidden>
                ·
              </span>
              <span>Şeffaf fiyat</span>
              <span className="hidden sm:inline" aria-hidden>
                ·
              </span>
              <span>7/24 destek</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border border-border-subtle bg-bg-card shadow-[0_24px_70px_-40px_rgba(11,30,59,0.35)] lg:absolute lg:right-6 lg:top-[calc(var(--header-h)+2.5rem)] lg:mx-0 lg:mt-0 lg:max-w-md lg:shadow-2xl xl:right-8"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease }}
        >
          <div className="relative aspect-[16/10] w-full">
            <Image
              src="https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=900&q=80"
              alt="Kiralık araç teslimi"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 400px"
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 text-[13px] sm:px-5">
            <div>
              <p className="font-semibold text-text">Havalimanı ve ofis teslim</p>
              <p className="text-xs text-text-muted">IST / SAW</p>
            </div>
            <span className="shrink-0 rounded-md bg-navy-hero px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white">
              Anında fiyat
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
