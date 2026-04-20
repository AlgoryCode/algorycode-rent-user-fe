"use client";

import { motion } from "framer-motion";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { SITE_SUPPORT_PHONE_TEL } from "@/lib/siteContact";
import { Reveal } from "@/components/ui/Reveal";

/** Teşvik / CTA bandı — ana sayfa modülü. */
export function MotivationSection() {
  return (
    <section id="tesvik" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20" aria-labelledby="home-motivation-heading">
      <Reveal y={32}>
        <motion.div
          className="relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-white px-6 py-10 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:px-10 sm:py-12 dark:border-border-subtle dark:bg-bg-card dark:shadow-sm"
          whileHover={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <h2
            id="home-motivation-heading"
            className="text-xl font-semibold tracking-tight text-text sm:text-2xl"
          >
            Hafta sonu veya iş seyahati —{" "}
            <span className="text-accent">aracı birkaç tıkla</span> ayırtın
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-[13px] text-text-muted sm:text-sm">
            Tarih ve lokasyonu seçin; uygun araçları anında listeleyin.
          </p>
          <motion.div
            className="mt-6 flex flex-wrap justify-center gap-2"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <AnimatedButton variant="primary" href="/araclar">
              Müsait araçlar
            </AnimatedButton>
            <AnimatedButton variant="ghost" href={SITE_SUPPORT_PHONE_TEL}>
              Bizi arayın
            </AnimatedButton>
          </motion.div>
        </motion.div>
      </Reveal>
    </section>
  );
}
