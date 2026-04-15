"use client";

import { motion } from "framer-motion";
import { Reveal } from "@/components/ui/Reveal";

const steps = [
  {
    title: "Tarih & lokasyon",
    body: "Alış–iade günleri ve noktayı seçin; uygun araçlar ve günlük fiyatlar listelenir.",
    icon: "01",
  },
  {
    title: "Rezervasyon",
    body: "Ek hizmetler ve sürücü bilgileri; özetten sonra onay.",
    icon: "02",
  },
  {
    title: "Teslim",
    body: "Havalimanı veya ofis teslimi; destek hattı yol boyunca.",
    icon: "03",
  },
];

export function HowItWorks() {
  return (
    <section id="nasil" className="relative border-y border-border-subtle bg-bg-raised/50 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Nasıl çalışır</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Üç adımda <span className="text-accent">tamamlayın</span>
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <motion.div
                className="relative h-full rounded-sm border border-border-subtle bg-bg-card p-5 transition-colors hover:border-accent/40 sm:p-6"
                whileHover={{ y: -2 }}
              >
                <span className="text-3xl font-semibold tabular-nums text-text-muted/20">{s.icon}</span>
                <h3 className="mt-3 text-base font-semibold text-text sm:text-lg">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-text-muted">{s.body}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
